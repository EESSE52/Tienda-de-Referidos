#!/usr/bin/env python3
"""Repara SOLO la D1 LOCAL usada por Wrangler para tienda_referidos.

Sin --apply audita la base del Worker. Con --apply inicializa schema catalog_*
y restaura SOLAMENTE las dos categorías desde un respaldo SQLite verificado.
No accede a --remote, no restaura productos y no altera el JSON.
Detener npm run worker:dev antes de ejecutar.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
BACKUP = Path.home() / "Documentos" / "DMonkeySport-Respaldos" / "d1-local-antes-limpieza-20261107T131430Z" / "catalogo-local-antes-limpieza.sqlite"
CONFIG = ROOT / "dist" / "server" / "wrangler.json"
MIGRATION = ROOT / "migrations" / "0002_catalog_compat.sql"
IDS = {"creatina", "proteina"}
TABLES = {"catalog_lists", "catalog_products"}

def fail(message):
    raise RuntimeError(message)

def execute_sql(sql=None, file=None):
    cmd = ["npx", "--no-install", "wrangler", "d1", "execute", "tienda_referidos",
           "--local", "--config", str(CONFIG), "--persist-to", str(ROOT / ".wrangler" / "state")]
    if file is not None:
        cmd += ["--file", str(file)]
    else:
        cmd += ["--command", sql]
    cmd.append("--json")
    process = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=120)
    if process.returncode:
        fail("Fallo Wrangler (NO se usó --remote): " + (process.stderr or process.stdout)[-1000:])
    # Wrangler --json puede imprimir instrucciones en stderr, pero stdout debe ser JSON.
    try:
        data = json.loads(process.stdout)
    except json.JSONDecodeError:
        fail("Wrangler no devolvió JSON verificable: " + process.stdout[-600:])
    if not isinstance(data, list) or not data or any(item.get("success") is not True for item in data):
        fail("Wrangler devolvió resultado no exitoso: " + process.stdout[-600:])
    return data[-1].get("results") or []

def inspect():
    rows = execute_sql("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    return {str(row["name"]) for row in rows}

def load_backup():
    if not BACKUP.is_file():
        fail("No existe el respaldo SQLite original: " + str(BACKUP))
    con = sqlite3.connect(BACKUP.as_uri() + "?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        if con.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            fail("El respaldo SQLite no pasó integrity_check.")
        cats = [dict(row) for row in con.execute(
            "SELECT id,slug,nombre,activa,data,updated_at FROM catalog_lists ORDER BY id")]
        if {x["id"] for x in cats} != IDS or len(cats) != 2:
            fail("El respaldo no contiene exactamente las dos categorías comerciales esperadas.")
        for cat in cats:
            raw = json.loads(cat["data"])
            if raw.get("id") != cat["id"] or raw.get("slug") != cat["slug"]:
                fail("Respaldo de categoría inconsistente: " + cat["id"])
        return cats
    finally:
        con.close()

def q(value):
    return "'" + str(value).replace("'", "''") + "'"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Crear tablas y recuperar 2 categorías SOLAMENTE EN D1 LOCAL")
    args = parser.parse_args()
    categories = load_backup()
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    binding = [x for x in config.get("d1_databases", []) if x.get("binding") == "CATALOG_DB"]
    if len(binding) != 1 or binding[0].get("database_name") != "tienda_referidos" or binding[0].get("database_id") != "c9cc30c6-365e-489a-9c5d-f4b213c674b2":
        fail("El CATALOG_DB del Worker compilado no coincide con la D1 autorizada.")
    tables = inspect()
    print("D1 del Worker: tienda_referidos (LOCAL)")
    print("Tablas actuales:", ", ".join(sorted(tables)))
    if TABLES.intersection(tables):
        # Si ya se inicializó, no sobrescribir ni reimportar.
        if not TABLES <= tables:
            fail("Esquema parcialmente inicializado: inspección manual necesaria.")
        current = execute_sql("SELECT id FROM catalog_lists ORDER BY id")
        products = execute_sql("SELECT COUNT(*) AS n FROM catalog_products")
        print("Categorías:", [r["id"] for r in current], "Productos:", products[0]["n"])
        if {r["id"] for r in current} == IDS and len(current) == 2 and products[0]["n"] == 0:
            print("ESTADO CORRECTO: no es necesario aplicar cambios.")
            return
        fail("Ya existe un catálogo diferente: se conserva sin modificar.")
    print("Respaldo validado:", BACKUP)
    print("Categorías que se restaurarán:", ", ".join(sorted(IDS)))
    if not args.apply:
        print("DIAGNÓSTICO: falta el esquema. Ejecuta el mismo script con --apply.")
        return
    # Esta migración crea solamente catalog_lists y catalog_products; no crea datos de prueba.
    if not MIGRATION.is_file():
        fail("Falta migrations/0002_catalog_compat.sql")
    with tempfile.TemporaryDirectory(prefix="dmonkeysport-local-") as directory:
        # Consolidar esquema y datos en un único archivo SQL de importación local.
        script = Path(directory) / "bootstrap.sql"
        source = MIGRATION.read_text(encoding="utf-8")
        statements = [source, "\n"]
        for cat in categories:
            vals = ", ".join(q(cat[k]) if k != "activa" else str(int(cat[k]))
                             for k in ("id", "slug", "nombre", "activa", "data", "updated_at"))
            statements.append(
                "INSERT OR IGNORE INTO catalog_lists "
                "(id,slug,nombre,activa,data,updated_at) VALUES (" + vals + ");\n"
            )
        script.write_text("".join(statements), encoding="utf-8")
        # Nunca se pasa --remote. Wrangler puede usar otra instancia SQLite, por eso
        # se usa exactamente el config y --persist-to de npm run worker:dev.
        execute_sql(file=script)
    tables = inspect()
    ids = execute_sql("SELECT id,slug,nombre,activa,data,updated_at FROM catalog_lists ORDER BY id")
    products = execute_sql("SELECT COUNT(*) AS n FROM catalog_products")
    if not TABLES <= tables or len(ids) != 2 or [x["id"] for x in ids] != ["creatina", "proteina"] or products[0]["n"] != 0:
        fail("La verificación posterior no coincide: inspeccionar D1 local; no ejecutar nuevamente.")
    for restored, original in zip(ids, categories):
        if restored != original:
            fail("Se detectó diferencia de configuración: " + original["id"])
    print("ÉXITO: D1 usada por Worker inicializada; 2 categorías completas, 0 productos.")
    print("No se modificó Cloudflare remoto ni productos JSON.")
    print("Fecha UTC:", datetime.now(timezone.utc).isoformat())

if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, sqlite3.Error, OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        sys.exit("ERROR / OPERACIÓN DETENIDA: " + str(error))
