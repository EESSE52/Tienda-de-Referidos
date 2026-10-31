from __future__ import annotations

import argparse
import json
import os
from typing import List

from extractor import build_payloads_from_urls, normalize_url, save_json
from uploader import load_env_or_default, upload_products


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extractor de productos para la tienda de referidos.")
    parser.add_argument("--lista", default="creatina", help="ID de la lista de productos a cargar.")
    parser.add_argument("--url", action="append", default=[], help="URL de Mercado Libre a procesar. Puede repetirse.")
    parser.add_argument("--file", help="Archivo txt con URLs (una por línea).")
    parser.add_argument("--output", default="python-extractor/output/productos.json", help="Ruta del JSON exportado.")
    parser.add_argument("--upload", action="store_true", help="Sube el JSON resultante a la API de admin de Cloudflare.")
    parser.add_argument("--site-url", help="URL del sitio publicado en Cloudflare.")
    parser.add_argument("--email", help="Correo asociado al acceso de Cloudflare admin.")
    parser.add_argument("--token", help="Token de autorización opcional.")
    return parser.parse_args()


def load_urls_from_file(path: str) -> List[str]:
    with open(path, "r", encoding="utf-8") as fh:
        return [normalize_url(line) for line in fh if line.strip()]


def main() -> None:
    args = parse_args()
    urls = [normalize_url(url) for url in args.url]

    if args.file:
        urls.extend(load_urls_from_file(args.file))

    if not urls:
        raise SystemExit("Debes indicar al menos una URL con --url o un archivo con --file.")

    payload = build_payloads_from_urls(urls, args.lista)
    output_path = save_json(payload, args.output)
    print(json.dumps({"ok": True, "export_path": output_path, "count": len(payload)}, ensure_ascii=False, indent=2))

    if args.upload:
        environment = load_env_or_default()
        site_url = args.site_url or environment["SITE_URL"]
        email = args.email or environment["CF_ACCESS_AUTHENTICATED_USER_EMAIL"]
        token = args.token or environment["CF_ACCESS_TOKEN"]
        if not site_url:
            raise SystemExit("Debes indicar --site-url o definir SITE_URL en el entorno.")
        result = upload_products(payload, site_url, email=email or None, auth_token=token or None)
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
