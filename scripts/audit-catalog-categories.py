#!/usr/bin/env python3
"""Comprueba en modo SOLO LECTURA las categorías del JSON y de la D1 local.

No modifica SQLite, JSON ni Cloudflare. Verifica los campos configurables y
distingue categorías comerciales de dos categorías de pruebas.
"""
import json
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / ".wrangler" / "state" / "v3" / "d1" / "miniflare-D1DatabaseObject"
REAL = {"creatina", "proteina"}
TEST = {"lista-prueba", "lista-validacion"}

def main():
    config = json.loads((ROOT / "wrangler.jsonc").read_text(encoding="utf-8"))
    bindings = {item["binding"]: item["database_name"] for item in config.get("d1_databases", [])}
    if bindings.get("CATALOG_DB") != "tienda_referidos":
        raise ValueError("El binding CATALOG_DB no corresponde a tienda_referidos")
    raw = json.loads((ROOT / "data" / "listas.json").read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("data/listas.json no es una lista")
    keys = [item.get("id") for item in raw]
    if len(keys) != len(set(keys)):
        raise ValueError("ID de categoría JSON duplicado")
    commercial = {item["id"]: item for item in raw if item["id"] in REAL}
    tests = [item for item in raw if item["id"] in TEST]
    extras = set(keys) - REAL - TEST
    if set(commercial) != REAL or extras:
        raise ValueError("Categorías JSON comerciales inesperadas: " + str(sorted(extras)))
    print("Categorías JSON:", len(raw))
    print(" Comerciales:", ", ".join(sorted(commercial)))
    print(" Pruebas (NO publicar):", ", ".join(item["id"] for item in tests))
    print(" CATALOG_DB:", bindings["CATALOG_DB"])
    paths = []
    for path in STATE.glob("*.sqlite"):
        if path.name == "metadata.sqlite" or path.is_symlink():
            continue
        try:
            with sqlite3.connect(path.as_uri() + "?mode=ro", uri=True) as db:
                names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                if {"catalog_lists", "catalog_products"} <= names:
                    paths.append(path)
        except sqlite3.DatabaseError as error:
            print("AVISO: no se pudo inspeccionar:", path, error)
    if len(paths) != 1:
        raise ValueError(f"Se esperaba una D1 local con catálogo, pero aparecen {len(paths)}")
    dbfile = paths[0]
    with sqlite3.connect(dbfile.as_uri() + "?mode=ro", uri=True) as db:
        rows = db.execute("SELECT id, slug, nombre, activa, data FROM catalog_lists ORDER BY id").fetchall()
        products = db.execute("SELECT COUNT(*) FROM catalog_products").fetchone()[0]
    print("D1 local:", dbfile.relative_to(ROOT))
    print(" Productos:", products)
    print(" Categorías D1:", len(rows))
    ids = {row[0] for row in rows}
    if ids != REAL:
        raise ValueError(f"Categorías D1 no coinciden con las dos comerciales: {sorted(ids)}")
    if products != 0:
        raise ValueError("La D1 local ya tiene productos; revisar antes de validar circuito vacío.")
    for id, slug, nombre, active, data in rows:
        parsed = json.loads(data)
        if parsed.get("id") != id or parsed.get("slug") != slug:
            raise ValueError("La categoría " + id + " no coincide entre columnas y JSON D1")
        for key in ("campos", "metricas", "mapa_atributos_ml"):
            if key not in parsed:
                raise ValueError(f"La categoría {id} no tiene {key}")
        defined_fields = len(parsed["campos"])
        defined_metrics = len(parsed["metricas"])
        print(f" - {nombre}: {defined_fields} campos, {defined_metrics} métricas, activa={active}")
        source = commercial[id]
        if parsed != source:
            print("   AVISO: configuración D1 diferente de JSON local; NO se sobrescribió.")
    print("\nAUDITORÍA COMPLETADA: D1 local sin productos, dos categorías comerciales conservadas.")
    print("No se modificó ningún dato ni se ejecutaron comandos remotos.")

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, sqlite3.DatabaseError, KeyError, TypeError) as e:
        sys.exit("AUDITORÍA INCOMPLETA: " + str(e))
