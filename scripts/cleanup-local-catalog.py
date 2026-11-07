#!/usr/bin/env python3
"""Auditoría y limpieza conservadora SOLO LOCAL del catálogo D'MonkeySport.

Sin --apply: únicamente inventario.
Con --apply: respalda y vacía data/productos.json SOLO si todos los registros
coinciden con los seis productos de prueba previamente identificados.
Las bases SQLite locales se inspeccionan, pero NO se modifican hasta verificar
qué registros contienen. Nunca llama a Wrangler ni a Cloudflare remoto.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import sys

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "data" / "productos.json"
CATEGORIES = ROOT / "data" / "listas.json"
STATE = ROOT / ".wrangler" / "state"
BACKUPS = Path.home() / "Documentos" / "DMonkeySport-Respaldos"
EXPECTED_IDS = frozenset((
    "creatina-monohidratada-300g",
    "proteina-whey-900g",
    "creatina-monohydrate-1793411068080",
    "test-producto-1793450440157",
    "creatina-test-1-1793451043016",
    "creatina-test-2-1793451043016",
))

def load_json(path):
    if not path.is_file():
        raise RuntimeError(f"Archivo inexistente: {path}")
    content = path.read_text(encoding="utf-8")
    obj = json.loads(content)
    if not isinstance(obj, list):
        raise RuntimeError(f"Se esperaba una lista JSON en {path}")
    return obj

def inspect_databases():
    if not STATE.exists():
        print("D1 local: no existe .wrangler/state.")
        return
    files = sorted(p for p in STATE.rglob("*") if p.is_file() and p.suffix in (".sqlite", ".db", ".sqlite3"))
    if not files:
        print("D1 local: no se encontraron archivos SQLite reconocibles en .wrangler/state.")
    for path in files:
        print("\nBASE SQLITE LOCAL:", path.relative_to(ROOT))
        try:
            db = sqlite3.connect("file:" + str(path.resolve()) + "?mode=ro", uri=True, timeout=3)
            try:
                tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                relevant = sorted(tables.intersection({"catalog_products", "catalog_lists", "products", "categories", "product_price_history", "affiliate_clicks"}))
                print(" Tablas relevantes:", ", ".join(relevant) if relevant else "ninguna")
                for table in relevant:
                    count = db.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
                    print(f"  {table}: {count}")
                    if table in {"catalog_products", "products"} and count:
                        cols = {row[1] for row in db.execute(f'PRAGMA table_info("{table}")')}
                        if "id" in cols:
                            for row in db.execute(f'SELECT id FROM "{table}" LIMIT 30'):
                                print("   producto:", str(row[0])[:200])
                            if count > 30:
                                print("   (más productos omitidos)")
            finally:
                db.close()
        except sqlite3.Error as exc:
            print(" AVISO: no se pudo inspeccionar SQLite:", str(exc)[:150])
    print("\nLas bases SQLite locales NO se modifican con esta herramienta.")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Limpia SOLO data/productos.json si están únicamente los seis ejemplos reconocidos.")
    args = parser.parse_args()
    products = load_json(PRODUCTS)
    categories = load_json(CATEGORIES)
    if not categories:
        raise RuntimeError("No hay categorías; se cancela por seguridad.")
    ids = [p.get("id") for p in products]
    print("CATÁLOGO JSON LOCAL:", len(products), "productos")
    print("CATEGORÍAS JSON:", len(categories), "(no se modifican)")
    for p in products:
        print(" -", p.get("id"), "|", str(p.get("nombre", ""))[:100])
    unknown = sorted({str(x) for x in ids if x not in EXPECTED_IDS})
    if unknown:
        print("\nATENCIÓN: hay productos no reconocidos como ejemplos:", unknown)
        print("No serán eliminados; revisa los nombres antes de continuar.")
    inspect_databases()
    if not args.apply:
        print("\nSOLO AUDITORÍA; no se han eliminado registros.")
        return
    if unknown or len(ids) != len(set(ids)):
        raise RuntimeError("Se cancela la limpieza porque existen productos desconocidos o IDs duplicados.")
    dest = BACKUPS / datetime.datetime.now(datetime.timezone.utc).strftime("limpieza-local-%Y%m%dT%H%M%SZ")
    dest.mkdir(parents=True, exist_ok=False, mode=0o700)
    os.chmod(dest, 0o700)
    for path in (PRODUCTS, CATEGORIES):
        backup = dest / path.name
        shutil.copy2(path, backup)
        os.chmod(backup, 0o600)
        if hashlib.sha256(path.read_bytes()).digest() != hashlib.sha256(backup.read_bytes()).digest():
            raise RuntimeError("Respaldo no coincide con archivo original: " + str(path))
    # Escritura atómica, conservando intacto el archivo de categorías.
    tmp = PRODUCTS.with_name(".productos.limpieza-temp.json")
    try:
        tmp.write_text("[]\n", encoding="utf-8")
        os.replace(tmp, PRODUCTS)
    finally:
        tmp.unlink(missing_ok=True)
    if load_json(PRODUCTS):
        raise RuntimeError("No se pudo verificar el archivo vacío. Restaurar respaldo: " + str(dest))
    print("\nLIMPIEZA JSON COMPLETADA: 0 productos. CATEGORÍAS INTACTAS.")
    print("Respaldo previo:", dest)
    print("IMPORTANTE: D1 local queda PENDIENTE hasta revisar el inventario anterior.")
    print("NUNCA se ejecutó ninguna operación sobre Cloudflare remoto.")

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, sqlite3.Error) as exc:
        sys.exit("ERROR: " + str(exc))
