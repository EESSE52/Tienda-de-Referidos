#!/usr/bin/env python3
"""Respaldos previos a limpieza D'MonkeySport. Solo lectura, nunca borra ni modifica D1."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
DATABASES = (
    ("dmonkeysport-db", "060d57f0-8bf5-4787-8d27-98ef9ade6251"),
    ("tienda_referidos", "c9cc30c6-365e-489a-9c5d-f4b213c674b2"),
)
STAMP = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
DEST = Path.home() / "Documentos" / "DMonkeySport-Respaldos" / STAMP

def item_info(file):
    content = file.read_bytes()
    return {"archivo": str(file), "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}

def record(results, name, run):
    try:
        return run()
    except Exception as error:
        results["advertencias"].append(f"{name}: {str(error)[:280]}")
        return None

def main():
    if not (ROOT / "wrangler.jsonc").exists():
        sys.exit("No se encontró wrangler.jsonc en el proyecto; no se realizó ninguna operación.")
    DEST.mkdir(parents=True, exist_ok=False, mode=0o700)
    os.chmod(DEST, 0o700)
    report = {"fecha_utc": STAMP, "destino": str(DEST), "bases_configuradas": [
        {"nombre": name, "id_configurado": identity} for name, identity in DATABASES
    ], "archivos": [], "advertencias": [], "eliminaciones": 0}
    for filename in ("productos.json", "listas.json", "revision-pendiente.json", "ultima-actualizacion.json"):
        src = ROOT / "data" / filename
        if not src.is_file():
            report["advertencias"].append(f"Archivo ausente: data/{filename}")
            continue
        def copy_json():
            parsed = json.loads(src.read_text(encoding="utf-8"))
            target = DEST / ("local-" + filename)
            shutil.copyfile(src, target)
            os.chmod(target, 0o600)
            info = item_info(target)
            info["registros_json"] = len(parsed) if isinstance(parsed, list) else None
            report["archivos"].append(info)
        record(report, filename, copy_json)
    local_state = ROOT / ".wrangler" / "state"
    if local_state.exists():
        report["estado_local_wrangler"] = str(local_state)
        # Copia física para preservar exactamente las bases D1 locales tal como las dejó Wrangler.
        state_copy = DEST / "wrangler-state-local"
        def copy_state():
            shutil.copytree(local_state, state_copy, symlinks=False)
            count = sum(1 for p in state_copy.rglob("*") if p.is_file())
            report["archivos"].append({"archivo": str(state_copy), "archivos_copiados": count, "tipo": "estado local Wrangler (incluye otros recursos locales)"})
        record(report, "estado local Wrangler", copy_state)
    else:
        report["advertencias"].append("No existe .wrangler/state: no hay estado local de Wrangler en esa ruta; comprueba si usas otro --persist-to.")
    for db_name, _ in DATABASES:
        path = DEST / ("d1-remoto-" + db_name + ".sql")
        command = ["npx", "--no-install", "wrangler", "d1", "export", db_name,
                   "--remote", "--config", str(ROOT / "wrangler.jsonc"), "--output", str(path)]
        print("Exportando solo lectura:", db_name, "(remoto)")
        try:
            proc = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
            if proc.returncode != 0 or not path.exists() or path.stat().st_size < 30:
                path.unlink(missing_ok=True)
                msg = (proc.stderr or proc.stdout or "No se generó un archivo válido.")[-600:]
                report["advertencias"].append(f"D1 remoto {db_name}: {msg.strip()}")
                continue
            os.chmod(path, 0o600)
            report["archivos"].append(item_info(path))
        except (OSError, subprocess.TimeoutExpired) as error:
            path.unlink(missing_ok=True)
            report["advertencias"].append(f"D1 remoto {db_name}: {str(error)[:240]}")
    report_file = DEST / "resumen-respaldos.json"
    report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(report_file, 0o600)
    print("\nResumen (NO se borró ningún producto):")
    print("Directorio de respaldos:", DEST)
    for obj in report["archivos"]:
        print(" OK:", Path(obj["archivo"]).name, obj.get("bytes", "directorio"), "bytes")
    for warning in report["advertencias"]:
        print(" AVISO:", warning)
    print("Detalle:", report_file)
    print("No compartas los archivos SQL/JSON públicamente: pueden contener datos privados.")

if __name__ == "__main__":
    main()
