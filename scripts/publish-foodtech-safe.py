#!/usr/bin/env python3
"""Publicación controlada de Foodtech en Cloudflare D1 remota.

--stage: introduce UN único producto Foodtech INACTIVO tras auditar respaldo.
--activate: después de desplegar el Worker, activa ese único producto.
No borra ni modifica categorías; nunca importa datos JSON de demostración.
No despliega el Worker: para ello utilizar Wrangler por separado.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "wrangler.jsonc"
LOCAL_CONFIG = ROOT / "dist/server/wrangler.json"
PERSIST = ROOT / ".wrangler/state"
DB = "tienda_referidos"
DB_ID = "c9cc30c6-365e-489a-9c5d-f4b213c674b2"
PRODUCT_ID = "MLC1859621269"


def fail(msg):
    raise RuntimeError(msg)


def cmd(args):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=180)
    if result.returncode:
        fail("Wrangler falló: " + (result.stderr or result.stdout)[-1000:])
    return result.stdout


def query(sql, remote=True):
    args = ["npx", "--no-install", "wrangler", "d1", "execute", DB,
            "--config", str(CONFIG if remote else LOCAL_CONFIG),
            "--remote" if remote else "--local"]
    if not remote:
        args += ["--persist-to", str(PERSIST)]
    args += ["--json", "--command", sql]
    raw = cmd(args)
    try:
        result = json.loads(raw)
    except ValueError:
        fail("Respuesta de Wrangler no es JSON válido")
    if not isinstance(result, list) or len(result) != 1 or result[0].get("success") is not True:
        fail("Respuesta D1 no válida: " + raw[-500:])
    return result[0].get("results", [])


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def verify_config(path):
    cfg = json.loads(path.read_text(encoding="utf-8"))
    binding = [x for x in cfg.get("d1_databases", []) if x.get("binding") == "CATALOG_DB"]
    if len(binding) != 1 or binding[0].get("database_name") != DB or binding[0].get("database_id") != DB_ID:
        fail("Binding D1 incorrecto en " + str(path))


def verify_repo():
    # El sitio no debe incorporar productos demo ni categorías de prueba en fallback.
    prods = json.loads((ROOT / "data/productos.json").read_text(encoding="utf-8"))
    cats = json.loads((ROOT / "data/listas.json").read_text(encoding="utf-8"))
    if prods != [] or {x["id"] for x in cats} != {"creatina", "proteina"} or len(cats) != 2:
        fail("Los JSON de respaldo aún incluyen datos de prueba; no publicar.")
    verify_config(CONFIG)
    verify_config(LOCAL_CONFIG)


def snapshot(remote):
    cats = query("SELECT id,slug,nombre,activa,data FROM catalog_lists ORDER BY id", remote)
    prods = query("SELECT id,lista_id,nombre,activo,data FROM catalog_products ORDER BY id", remote)
    if len(cats) != 2 or [c["id"] for c in cats] != ["creatina", "proteina"]:
        fail("Las categorías D1 no coinciden con las dos comerciales.")
    return cats, prods


def get_product(rows):
    if len(rows) != 1 or rows[0]["id"] != PRODUCT_ID or rows[0]["lista_id"] != "creatina":
        fail("La D1 local debe contener exclusivamente el Foodtech autorizado.")
    data = json.loads(rows[0]["data"])
    fields = data.get("atributos") or {}
    if (data.get("id") != PRODUCT_ID or data.get("activo") is not False
        or data.get("lista_id") != "creatina" or data.get("precio") != 34990
        or fields.get("gramos_total") != 1000 or fields.get("porciones") != 200
        or fields.get("dosis_5g") != 200
        or data.get("enlace_referido") != "https://meli.la/22bG2Z5"):
        fail("El producto local cambió respecto a los datos auditados.")
    return data


def audit(plan_dir):
    manifest = json.loads((plan_dir / "auditoria.json").read_text(encoding="utf-8"))
    if manifest.get("database_id") != DB_ID or manifest.get("producto_local") != PRODUCT_ID or manifest.get("productos_remotos_antes") != 0:
        fail("Manifiesto de auditoría incompatible.")
    backup = Path(manifest["respaldo_sql"])
    if not backup.is_file() or hashlib.sha256(backup.read_bytes()).hexdigest() != manifest["respaldo_sha256"]:
        fail("El respaldo SQL ha cambiado o desaparecido.")
    if Path(manifest["plan_sql"]).resolve() != (plan_dir / "foodtech-inactivo-PENDIENTE-APROBACION.sql").resolve():
        fail("Ruta SQL no coincide con el manifiesto.")
    if manifest.get("se_aplico_en_remoto") is not False:
        fail("El respaldo de auditoría no es de preparación.")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--stage", action="store_true", help="Inserta solo Foodtech inactivo en remoto")
    mode.add_argument("--activate", action="store_true", help="Activa únicamente Foodtech ya insertado")
    parser.add_argument("--plan-dir", type=Path, required=True, help="Carpeta prepublicacion-foodtech-... validada")
    args = parser.parse_args()
    plan_dir = args.plan_dir.expanduser().resolve()
    verify_repo()
    audit(plan_dir)
    local_categories, local_products = snapshot(False)
    remote_categories, remote_products = snapshot(True)
    if local_categories != remote_categories:
        fail("Las categorías locales y remotas cambiaron. Detenido para evitar alterarlas.")
    local_data = get_product(local_products)
    if args.stage:
        if remote_products:
            fail("La base remota ya tiene productos. No se insertó nada.")
        sql = (plan_dir / "foodtech-inactivo-PENDIENTE-APROBACION.sql").read_text(encoding="utf-8")
        if "INSERT INTO catalog_products" not in sql or "DELETE" in sql.upper() or "UPDATE " in sql.upper():
            fail("El SQL preparado no coincide con una inserción de un solo producto.")
        # Ejecutar con la conexión remota, sin depender del directorio donde se llamó.
        result = cmd(["npx", "--no-install", "wrangler", "d1", "execute", DB,
                      "--remote", "--config", str(CONFIG), "--file",
                      str(plan_dir / "foodtech-inactivo-PENDIENTE-APROBACION.sql")])
        cats_after, products_after = snapshot(True)
        if cats_after != remote_categories or len(products_after) != 1 or products_after[0]["id"] != PRODUCT_ID or products_after[0]["activo"] != 0:
            fail("Estado remoto inesperado tras la inserción. No activar; revisar manualmente.")
        if json.loads(products_after[0]["data"]) != local_data:
            fail("Los datos remotos no coinciden con los locales. No activar.")
        print("ETAPA LISTA: Foodtech guardado INACTIVO en D1 remota; 2 categorías intactas.")
        print("Siguiente: ejecutar npm test, npm run build y despliegue del Worker; luego --activate.")
    else:
        if len(remote_products) != 1 or remote_products[0]["id"] != PRODUCT_ID or remote_products[0]["activo"] != 0:
            fail("Activación exige exactamente un Foodtech remoto inactivo.")
        if json.loads(remote_products[0]["data"]) != local_data:
            fail("El producto remoto no coincide con el local.")
        sql = ("UPDATE catalog_products SET activo=1, data=json_set(data, '$.activo', json('true')),"
               " updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"
               " WHERE id=" + quote(PRODUCT_ID) +
               " AND activo=0 AND (SELECT COUNT(*) FROM catalog_products)=1"
               " AND (SELECT COUNT(*) FROM catalog_lists)=2")
        query(sql, remote=True)
        cats_after, products_after = snapshot(True)
        if cats_after != remote_categories or len(products_after) != 1 or products_after[0]["id"] != PRODUCT_ID or products_after[0]["activo"] != 1 or json.loads(products_after[0]["data"]).get("activo") is not True:
            fail("Activación no confirmada; revisar D1 antes de continuar.")
        print("PUBLICADO EN D1 REMOTA: Foodtech ACTIVO; 2 categorías intactas.")
        print("Comprueba https://dmonkeysport.com/lista/creatina")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print("OPERACIÓN DETENIDA: " + str(exc), file=sys.stderr)
        sys.exit(1)
