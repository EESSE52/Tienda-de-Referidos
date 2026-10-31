from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.3",
    "Accept-Language": "es-CL,es;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def slugify(value: str) -> str:
    text = value.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def sanitize_price(value: Any) -> float:
    if value in (None, "", "N/A"):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value)
    text = text.replace("$", "").replace(".", "").replace(".", "")
    text = text.replace(".", "").replace(",", ".")
    text = re.sub(r"[^0-9.\-]", "", text)
    try:
        return float(text)
    except ValueError:
        return 0.0


def extract_product_id(url: str) -> str:
    match = re.search(r"/(?:ML[A-Z0-9]+|[A-Za-z0-9]+-[A-Za-z0-9]+)", url)
    return match.group(0).split("/")[-1] if match else "manual-product"


def extract_meta_data(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    data: Dict[str, Any] = {}

    for meta in soup.find_all("meta"):
        key = meta.get("property") or meta.get("name")
        if not key:
            continue
        value = meta.get("content")
        if value:
            data[str(key)] = str(value)

    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payload = json.loads(script.string)
            if isinstance(payload, dict):
                data["ld_json"] = payload
        except Exception:
            pass

    return data


def extract_from_html(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    meta = extract_meta_data(html)

    title = ""
    og_title = meta.get("og:title")
    if og_title:
        title = clean_text(og_title)
    if not title:
        title_tag = soup.find("title")
        if title_tag:
            title = clean_text(title_tag.get_text())

    brand = ""
    for selectors in [
        ["brand", "seller-brand", "product-brand"],
        ["brandName"],
    ]:
        for key in selectors:
            value = meta.get(key)
            if value:
                brand = clean_text(value)
                break
        if brand:
            break

    price = 0.0
    for selector in [
        "price",
        "productPrice",
        "amount",
        "priceAmount",
        "product-price",
        "og:price:amount",
    ]:
        value = meta.get(selector)
        if value:
            try:
                price = float(str(value).replace(",", "."))
                break
            except ValueError:
                pass

    if not price:
        patterns = [
            r'"price"\s*:\s*"?([0-9.]+)"?',
            r'"amount"\s*:\s*"?([0-9.]+)"?',
            r'\$\s*([0-9\\.]+)',
            r'([0-9]{1,3}(?:\\.[0-9]{3})*(?:\\,[0-9]{2})?)',
        ]
        for pattern in patterns:
            match = re.search(pattern, html)
            if match:
                price = sanitize_price(match.group(1))
                if price:
                    break

    attrs: Dict[str, Any] = {}
    for key, value in meta.items():
        if key in {"og:title", "og:description", "twitter:title", "twitter:description"}:
            continue
        if value and len(str(value)) < 120:
            attrs[key] = value

    seller = ""
    seller_candidates = [
        meta.get("seller_name"),
        meta.get("twitter:creator"),
        meta.get("author"),
    ]
    for candidate in seller_candidates:
        if candidate:
            seller = clean_text(candidate)
            break

    if not seller:
        seller_match = re.search(r'"seller"\s*:\s*"([^\"]+)"', html)
        if seller_match:
            seller = clean_text(seller_match.group(1))

    image = ""
    for key in ["og:image", "twitter:image", "image"]:
        value = meta.get(key)
        if value:
            image = str(value)
            break

    return {
        "nombre": title or "NOMBRE_A_CARGAR",
        "marca": brand or "MARCA_A_CARGAR",
        "precio": float(price or 0),
        "vendedor": seller or "VENDEDOR_A_CARGAR",
        "imagen": image,
        "atributos": attrs,
    }


def fetch_page(url: str) -> str:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=20)
    response.raise_for_status()
    return response.text


def build_fallback_product_payload(url: str, lista_id: str, *, message: str | None = None) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    fallback_message = message or "No se pudo extraer la información desde la URL. Revisa la publicación o complétala manualmente."
    return {
        "id": slugify(f"{lista_id}-{extract_product_id(url)}") + f"-{int(now.timestamp() * 1000)}",
        "lista_id": lista_id,
        "nombre": "PRODUCTO_PENDIENTE",
        "marca": "MARCA_A_CARGAR",
        "precio": 0.0,
        "fecha_precio": now.strftime("%Y-%m-%d"),
        "id_publicacion": extract_product_id(url),
        "enlace_referido": url,
        "url_publicacion": url,
        "imagen": "",
        "activo": True,
        "vendedor": "VENDEDOR_A_CARGAR",
        "atributos": {
            "estado_extraccion": "pendiente",
            "observacion": fallback_message,
        },
        "historial_precios": [{"fecha": now.strftime("%Y-%m-%d"), "precio": 0.0}],
    }


def build_product_payload(url: str, lista_id: str, *, overrides: Dict[str, Any] | None = None) -> Dict[str, Any]:
    overrides = overrides or {}
    try:
        html = fetch_page(url)
        extracted = extract_from_html(html)
    except (requests.RequestException, ValueError, TypeError) as exc:
        final = build_fallback_product_payload(url, lista_id, message=f"URL no accesible: {exc}")
        final.update(overrides)
        return final
    except Exception as exc:  # pragma: no cover - safety net
        final = build_fallback_product_payload(url, lista_id, message=f"Error inesperado al procesar la URL: {exc}")
        final.update(overrides)
        return final

    final = {
        "id": slugify(f"{lista_id}-{extract_product_id(url)}") + f"-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "lista_id": lista_id,
        "nombre": extracted["nombre"],
        "marca": extracted["marca"],
        "precio": float(extracted.get("precio") or 0),
        "fecha_precio": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "id_publicacion": extract_product_id(url),
        "enlace_referido": url,
        "url_publicacion": url,
        "imagen": extracted.get("imagen") or "",
        "activo": True,
        "vendedor": extracted.get("vendedor") or "VENDEDOR_A_CARGAR",
        "atributos": extracted.get("atributos") or {},
        "historial_precios": [{"fecha": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "precio": float(extracted.get("precio") or 0)}],
    }

    final.update(overrides)
    return final


def build_payloads_from_urls(urls: List[str], lista_id: str) -> List[Dict[str, Any]]:
    products: List[Dict[str, Any]] = []
    for raw_url in urls:
        url = raw_url.strip()
        if not url:
            continue
        products.append(build_product_payload(url, lista_id))
    return products


def save_json(payload: List[Dict[str, Any]], output_file: str):
    destination = Path(output_file)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(destination)


def normalize_url(raw_url: str) -> str:
    clean = raw_url.strip()
    if not clean:
        return ""
    if clean.startswith("http://") or clean.startswith("https://"):
        return clean
    return f"https://{clean}"
