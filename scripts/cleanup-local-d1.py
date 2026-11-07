#!/usr/bin/env python3
"""Limpia únicamente cuatro registros conocidos de catalog_products en D1 LOCAL.

Sin --apply audita. Con --apply crea respaldo SQLite consistente en Documentos
y borra SOLO los cuatro IDs detectados. Nunca llama a Wrangler, red o Cloudflare.
No modifica tablas de categorías, historial, clics, productos legacy ni JSON.
Se recomienda detener wrangler dev antes de ejecutarlo.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import os
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / ".wrangler" / "state" / "v3" / "d1" / "miniflare-D1DatabaseObject"
BACKUPS = Path.home() / "Documentos" / "DMonkeySport-Respaldos"
KNOWN_IDS = frozenset({
    "MLC35176477",
    "creatina-monohidratada-300g",
    "creatina-prueba-dmonkeysport-300g-1793493221120",
    "proteina-whey-900g",
})
TABLES_TO_RETAIN = ("catalog_lists", "categories", "products", "product_price_history", "affiliate_clicks")

def dbconnect(path, readonly=False):
    if readonly:
        return sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=3)
    return sqlite3.connect(path, timeout=3)

def snapshot(db):
    names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if "catalog_products" not in names or not set(TABLES_TO_RETAIN).issubset(names):
        raise RuntimeError("Esquema diferente al auditado: se cancela.")
    rows = db.execute("SELECT id FROM catalog_products ORDER BY id").fetchall()
    ids = [r[0] for r in rows]
    preserved = {}
    for table in TABLES_TO_RETAIN:
        preserved[table] = (
            db.execute('SELECT * FROM "' + table + '" ORDER BY rowid').fetchall()
        )
    return ids, preserved

def validate(ids, preserved):
    if len(ids) != 4 or frozenset(ids) != KNOWN_IDS or len(set(ids)) != 4:
        raise RuntimeError("Los cuatro IDs de D1 local ya no coinciden con el inventario; no se borra nada.")
    if len(preserved["catalog_lists"]) != 2 or len(preserved["categories"]) != 2:
        raise RuntimeError("El número de categorías cambió; no se borra nada.")
    for table in ("products", "product_price_history", "affiliate_clicks"):
        if preserved[table]:
            raise RuntimeError(f"La tabla {table} contiene datos: se requiere nueva revisión.")

def locate():
    if not STATE.is_dir():
        raise RuntimeError("No se encontró el estado D1 local de Wrangler.")
    candidates = []
    for path in STATE.glob("*.sqlite"):
        if path.name == "metadata.sqlite" or path.is_symlink():
            continue
        try:
            with dbconnect(path, readonly=True) as db:
                if {r[0] for r in db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )} >= {"catalog_products", "catalog_lists"}:
                    candidates.append(path)
        except sqlite3.Error as error:
            raise RuntimeError("No se pudo inspeccionar " + str(path) + ": " + str(error)) from error
    if len(candidates) != 1:
        raise RuntimeError(f"Se esperó una sola base con catálogo local, se encontraron {len(candidates)}. No se borra nada.")
    return candidates[0]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="Respaldar y eliminar únicamente los cuatro IDs conocidos en D1 LOCAL.")
    args = parser.parse_args()
    path = locate()
    with dbconnect(path, readonly=True) as db:
        ids, preserved = snapshot(db)
    print("D1 LOCAL:", path.relative_to(ROOT))
    print("Productos actuales:", len(ids))
    for value in ids:
        print(" -", value)
    print("Categorías catalog_lists:", len(preserved["catalog_lists"]))
    print("Categorías legacy:", len(preserved["categories"]))
    validate(ids, preserved)
    if not args.apply:
        print("AUDITORÍA APROBADA: no se ha borrado nada.")
        print("Para respaldar y limpiar solo D1 local: python3 scripts/cleanup-local-d1.py --apply")
        return

    BACKUPS.mkdir(parents=True, exist_ok=True)
    folder = BACKUPS / datetime.now(timezone.utc).strftime("d1-local-antes-limpieza-%Y%m%dT%H%M%SZ")
    folder.mkdir(mode=0o700)
    backup = folder / "catalogo-local-antes-limpieza.sqlite"
    # SQLite backup API incluye transacciones WAL confirmadas sin copiar archivos WAL por separado.
    with dbconnect(path, readonly=True) as original, dbconnect(backup) as copy:
        original.backup(copy)
    os.chmod(backup, 0o600)
    with dbconnect(backup, readonly=True) as check:
        if check.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("Respaldo no pasó integrity_check.")
        backup_ids, backup_preserved = snapshot(check)
    if backup_ids != ids or backup_preserved != preserved:
        raise RuntimeError("El respaldo no coincide con la lectura inicial; no se ha borrado nada.")
    digest = hashlib.sha256(backup.read_bytes()).hexdigest()
    print("Respaldo SQLite verificado:", backup)
    print("SHA256:", digest)

    # BEGIN IMMEDIATE bloquea escritores mientras se verifica y se elimina.
    with dbconnect(path) as db:
        try:
            db.execute("BEGIN IMMEDIATE")
            live_ids, live_preserved = snapshot(db)
            if live_ids != ids or live_preserved != preserved:
                raise RuntimeError("D1 local cambió después del respaldo; transacción cancelada.")
            placeholders = ",".join("?" for _ in KNOWN_IDS)
            cursor = db.execute(
                f"DELETE FROM catalog_products WHERE id IN ({placeholders})",
                tuple(sorted(KNOWN_IDS))
            )
            if cursor.rowcount != 4:
                raise RuntimeError("Cantidad eliminada distinta de cuatro; transacción cancelada.")
            after_ids, after_preserved = snapshot(db)
            if after_ids or after_preserved != preserved:
                raise RuntimeError("Se detectaron cambios fuera del catálogo; transacción cancelada.")
            db.commit()
        except Exception:
            db.rollback()
            raise
    with dbconnect(path, readonly=True) as db:
        remain, retained = snapshot(db)
    if remain or retained != preserved:
        raise RuntimeError("ALERTA: verificación posterior no coincide. Conserva el respaldo.")
    print("ÉXITO: 0 productos en catalog_products de D1 LOCAL.")
    print("CONSERVADOS: 2 catalog_lists, 2 categories, tablas restantes intactas.")
    print("Sin conexión a Cloudflare remoto. No se modificaron productos.json ni listas.json.")

if __name__ == "__main__":
    try:
        main()
    except (OSError, sqlite3.Error, RuntimeError) as error:
        sys.exit("OPERACIÓN CANCELADA / ERROR: " + str(error))
