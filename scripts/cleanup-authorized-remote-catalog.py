#!/usr/bin/env python3
"""Limpieza estrictamente acotada de los cuatro productos autorizados de D1.

Por defecto: auditoría de SOLO LECTURA. Para ejecutar: --apply.
No toca JSON local, categorías, la otra D1 ni los secretos OAuth.
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import sqlite3
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
DATABASE_NAME = "tienda_referidos"
DATABASE_ID = "c9cc30c6-365e-489a-9c5d-f4b213c674b2"
PRODUCT_IDS = (
    "producto-creatina-gomitas-150-unidades-foodtech-sabor-blueberry-libre-gluten-1793124326782",
    "producto-creatina-gomitas-150-unidades-foodtech-sabor-blueberry-libre-gluten-1793124350001",
    "creatina-monohidratada-300g",
    "proteina-whey-900g",
)

def abort(message):
    raise SystemExit("OPERACIÓN CANCELADA (sin nuevos cambios): " + message)

def query(sql):
    command = [
        "npx", "--no-install", "wrangler", "d1", "execute", DATABASE_NAME,
        "--config", str(ROOT / "wrangler.jsonc"), "--remote", "--json",
        "--command", sql,
    ]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
    if result.returncode:
        abort("Cloudflare no respondió correctamente. " + result.stderr[-450:])
    try:
        parsed = json.loads(result.stdout)
        if not isinstance(parsed, list) or len(parsed) != 1 or parsed[0].get("success") is not True:
            abort("Respuesta JSON de Wrangler inesperada; no se borró nada.")
        return parsed[0].get("results", [])
    except (ValueError, KeyError, TypeError) as error:
        abort("No se pudo validar el JSON de Wrangler: " + str(error))

def snapshot():
    products = query("SELECT id, nombre, lista_id, activo FROM catalog_products ORDER BY id")
    categories = query("SELECT id, slug, nombre, activa, data FROM catalog_lists ORDER BY id")
    return products, categories

def validate_snapshot(products, categories, label):
    ids = [entry.get("id") for entry in products]
    if len(ids) != 4 or set(ids) != set(PRODUCT_IDS):
        abort(label + ": los cuatro identificadores ya no coinciden con la autorización.")
    if len(categories) != 2 or len({entry.get("id") for entry in categories}) != 2:
        abort(label + ": se esperaban exactamente dos categorías.")
    if {row.get("lista_id") for row in products} - {row.get("id") for row in categories}:
        abort(label + ": productos con categorías inesperadas.")

def backup_snapshot(path):
    if not path.is_file() or path.stat().st_size < 1000:
        abort("Respaldo inexistente o demasiado pequeño: " + str(path))
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    # Validar integridad del SQL mediante una restauración temporal en memoria, sin alterar archivos.
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(data.decode("utf-8-sig"))
        products = [dict(row) for row in conn.execute(
            "SELECT id, nombre, lista_id, activo FROM catalog_products ORDER BY id")]
        categories = [dict(row) for row in conn.execute(
            "SELECT id, slug, nombre, activa, data FROM catalog_lists ORDER BY id")]
    except (sqlite3.DatabaseError, UnicodeError) as error:
        abort("El archivo SQL no se pudo restaurar en memoria: " + str(error))
    finally:
        conn.close()
    validate_snapshot(products, categories, "Respaldo SQL")
    return digest, products, categories

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backup", required=True, type=Path, help="Ruta del SQL exportado de tienda_referidos")
    parser.add_argument("--apply", action="store_true", help="Ejecuta la eliminación de los cuatro IDs autorizados")
    args = parser.parse_args()

    config = json.loads((ROOT / "wrangler.jsonc").read_text(encoding="utf-8"))
    matches = [entry for entry in config.get("d1_databases", [])
               if entry.get("database_name") == DATABASE_NAME and entry.get("database_id") == DATABASE_ID]
    if len(matches) != 1:
        abort("El enlace D1 en wrangler.jsonc ya no coincide con el ID autorizado.")
    digest, saved_products, saved_categories = backup_snapshot(args.backup)
    current_products, current_categories = snapshot()
    validate_snapshot(current_products, current_categories, "Cloudflare D1")
    if current_products != saved_products:
        abort("El inventario remoto cambió desde el respaldo. Hacer un nuevo respaldo.")
    if current_categories != saved_categories:
        abort("Las categorías remotas no coinciden exactamente con el respaldo. Hacer uno nuevo.")

    print("RESPALDO SQL RESTAURADO Y VALIDADO: " + str(args.backup))
    print("SHA256: " + digest)
    print("BASE REMOTA: " + DATABASE_NAME + " (" + DATABASE_ID + ")")
    print("PRODUCTOS EXACTOS: 4 / CATEGORÍAS A CONSERVAR: 2")
    for product in current_products:
        print(" -", product["id"], "|", product["nombre"])
    if not args.apply:
        print("\nSOLO AUDITORÍA: no se realizó ningún DELETE.")
        print("Para ejecutar la autorización existente, vuelve a usar el mismo comando añadiendo --apply.")
        return

    # La condición de conteos evita borrar si se creó un nuevo producto entre la auditoría y el DELETE.
    id_list = ", ".join("'" + value + "'" for value in PRODUCT_IDS)
    sql = (
        "DELETE FROM catalog_products WHERE id IN (" + id_list + ") "
        "AND (SELECT COUNT(*) FROM catalog_products)=4 "
        "AND (SELECT COUNT(*) FROM catalog_lists)=2"
    )
    print("\nEjecutando eliminación remota de los 4 ID autorizados...")
    query(sql)
    after_products, after_categories = snapshot()
    if after_products:
        abort("La eliminación no produjo un catálogo vacío; consultar el estado remoto antes de reintentar.")
    if after_categories != saved_categories:
        abort("ALERTA: las categorías ya no coinciden; no continuar con ninguna operación.")
    print("VERIFICACIÓN COMPLETA: 0 productos en catalog_products; 2 categorías intactas.")
    print("Los archivos JSON locales no fueron modificados.")
    print("Hora UTC:", datetime.datetime.now(datetime.timezone.utc).isoformat())

if __name__ == "__main__":
    main()
