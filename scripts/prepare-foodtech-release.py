#!/usr/bin/env python3
"""Audita y prepara Foodtech para una futura publicación, SIN ESCRIBIR D1 remota.

Uso: python3 scripts/prepare-foodtech-release.py
Genera un respaldo SQL remoto y un INSERT de preparación INACTIVO. Ningún
archivo generado se aplica automáticamente. No ejecuta deploy, migraciones,
UPDATE, DELETE ni INSERT en Cloudflare remoto.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DB = "tienda_referidos"
DB_ID = "c9cc30c6-365e-489a-9c5d-f4b213c674b2"
PRODUCT_ID = "MLC1859621269"
CATEGORY_IDS = {"creatina", "proteina"}
LOCAL_CONFIG = ROOT / "dist/server/wrangler.json"
REMOTE_CONFIG = ROOT / "wrangler.jsonc"
PERSIST = ROOT / ".wrangler/state"
BACKUPS = Path.home() / "Documentos/DMonkeySport-Respaldos"


def stop(message):
    raise RuntimeError(message)


def call(args, timeout=180):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        stop("Falló Wrangler: " + (result.stderr or result.stdout)[-1000:])
    return result.stdout


def binding(config_file):
    if not config_file.is_file():
        stop("Falta configuración: " + str(config_file))
    cfg = json.loads(config_file.read_text(encoding="utf-8"))
    matches = [b for b in cfg.get("d1_databases", [])
               if b.get("binding") == "CATALOG_DB"]
    if len(matches) != 1 or matches[0].get("database_name") != DB or matches[0].get("database_id") != DB_ID:
        stop("CATALOG_DB no apunta a la D1 autorizada: " + str(config_file))


def query(sql, *, remote):
    args = ["npx", "--no-install", "wrangler", "d1", "execute", DB,
            "--config", str(REMOTE_CONFIG if remote else LOCAL_CONFIG),
            "--remote" if remote else "--local"]
    if not remote:
        args += ["--persist-to", str(PERSIST)]
    args += ["--json", "--command", sql]
    raw = call(args)
    try:
        reply = json.loads(raw)
    except ValueError:
        stop("Respuesta D1 no es JSON: " + raw[-350:])
    if not isinstance(reply, list) or len(reply) != 1 or reply[0].get("success") is not True:
        stop("Respuesta D1 inesperada: " + raw[-350:])
    return reply[0].get("results", [])


def state(remote):
    tables = query("SELECT name FROM sqlite_master WHERE type='table'", remote=remote)
    names = {row["name"] for row in tables}
    if not {"catalog_lists", "catalog_products"} <= names:
        stop(("Remota" if remote else "Local") + ": faltan tablas catalog_*.")
    categories = query("SELECT id,slug,nombre,activa,data FROM catalog_lists ORDER BY id", remote=remote)
    if len(categories) != 2 or {x["id"] for x in categories} != CATEGORY_IDS:
        stop(("Remota" if remote else "Local") + ": las categorías cambiaron; no continuar.")
    products = query("SELECT id,lista_id,nombre,activo,data FROM catalog_products ORDER BY id", remote=remote)
    return categories, products


def validate_product(products):
    if len(products) != 1 or products[0]["id"] != PRODUCT_ID:
        stop("D1 local debe tener exactamente el producto Foodtech autorizado (1 registro).")
    row = products[0]
    product = json.loads(row["data"])
    if product.get("id") != PRODUCT_ID or row["lista_id"] != "creatina" or product.get("lista_id") != "creatina":
        stop("ID y categoría de Foodtech no coinciden.")
    if row["activo"] != 0 or product.get("activo") is not False or product.get("es_prueba"):
        stop("El producto local debe estar inactivo y no ser de prueba.")
    if product.get("precio") != 34990:
        stop("Precio inesperado; revisar manualmente.")
    attrs = product.get("atributos") or {}
    if attrs.get("gramos_total") != 1000 or attrs.get("porciones") != 200 or attrs.get("dosis_5g") != 200:
        stop("Peso, porciones o dosis no coinciden.")
    link = str(product.get("enlace_referido") or "")
    url = urlparse(link)
    if url.scheme != "https" or url.hostname not in ("meli.la", "mercadolibre.cl", "www.mercadolibre.cl", "articulo.mercadolibre.cl"):
        stop("Enlace afiliado no válido.")
    if not re.search(r"foodtech", str(product.get("nombre", "")), flags=re.I):
        stop("El nombre del producto no coincide con Foodtech.")
    return product


def quote_sql(value):
    return "'" + str(value).replace("'", "''") + "'"


def validate_backup(path, categories):
    raw = path.read_bytes()
    if len(raw) < 500:
        stop("Respaldo remoto demasiado pequeño: " + str(path))
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    try:
        con.executescript(raw.decode("utf-8-sig"))
        found = [dict(x) for x in con.execute("SELECT id,slug,nombre,activa,data FROM catalog_lists ORDER BY id")]
        if found != categories:
            stop("Las categorías del respaldo no coinciden con la auditoría remota.")
        count = con.execute("SELECT COUNT(*) FROM catalog_products").fetchone()[0]
        if count != 0:
            stop("El respaldo remoto contiene productos inesperados.")
    finally:
        con.close()
    return hashlib.sha256(raw).hexdigest()


def main():
    binding(LOCAL_CONFIG)
    binding(REMOTE_CONFIG)
    local_categories, local_products = state(remote=False)
    remote_categories, remote_products = state(remote=True)
    product = validate_product(local_products)
    if remote_products:
        stop("D1 remota contiene productos. No generar SQL hasta revisar diferencias.")
    if [x["data"] for x in local_categories] != [x["data"] for x in remote_categories]:
        stop("Las categorías locales/remotas difieren; revisar fórmulas antes de publicar.")
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    directory = BACKUPS / ("prepublicacion-foodtech-" + now)
    directory.mkdir(parents=True, exist_ok=False)
    backup = directory / "tienda_referidos-remoto-antes-foodtech.sql"
    try:
        call(["npx", "--no-install", "wrangler", "d1", "export", DB, "--remote",
              "--config", str(REMOTE_CONFIG), "--output", str(backup)], timeout=240)
        digest = validate_backup(backup, remote_categories)
    except Exception:
        print("ATENCIÓN: respaldo no validado. No utilizar los archivos de esta carpeta.", file=sys.stderr)
        raise
    # El SQL solo prepara la oferta INACTIVA. Activación/despliegue requieren
    # una aprobación posterior y una comprobación de imágenes y enlace.
    product["activo"] = False
    sql = (
        "-- PREPARACIÓN SOLAMENTE. NO EJECUTAR SIN AUTORIZACIÓN EXPLÍCITA.\n"
        "-- Inserta una sola oferta inactiva; no borra ni altera categorías.\n"
        "INSERT INTO catalog_products (id, lista_id, nombre, activo, data, updated_at)\n"
        "SELECT " + ", ".join([
            quote_sql(PRODUCT_ID), quote_sql("creatina"),
            quote_sql(product["nombre"]), "0",
            quote_sql(json.dumps(product, ensure_ascii=False, separators=(",", ":"))),
            "strftime('%Y-%m-%dT%H:%M:%fZ','now')"
        ]) + "\n"
        "WHERE (SELECT COUNT(*) FROM catalog_products)=0\n"
        "AND (SELECT COUNT(*) FROM catalog_lists)=2\n"
        "AND EXISTS(SELECT 1 FROM catalog_lists WHERE id='creatina');\n"
    )
    plan = directory / "foodtech-inactivo-PENDIENTE-APROBACION.sql"
    plan.write_text(sql, encoding="utf-8")
    audit = {
        "fecha_utc": now, "base_remota": DB, "database_id": DB_ID,
        "categorias": sorted(CATEGORY_IDS),
        "productos_remotos_antes": 0, "producto_local": PRODUCT_ID,
        "precio_clp": product["precio"], "activo_propuesto": False,
        "respaldo_sql": str(backup), "respaldo_sha256": digest,
        "plan_sql": str(plan), "se_aplico_en_remoto": False,
    }
    (directory / "auditoria.json").write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("AUDITORÍA Y RESPALDO CORRECTOS. NO SE MODIFICÓ D1 REMOTA.")
    print("Categorías conservadas:", ", ".join(sorted(CATEGORY_IDS)))
    print("D1 local: 1 Foodtech inactivo; D1 remota: 0 productos.")
    print("Respaldo remoto:", backup)
    print("SHA256:", digest)
    print("SQL preparado (NO EJECUTADO):", plan)
    print("Pendiente: revisar enlaces/imagen, autorizar inserción y posterior activación.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, sqlite3.Error, subprocess.TimeoutExpired) as error:
        print("PREPARACIÓN DETENIDA: " + str(error), file=sys.stderr)
        sys.exit(1)
