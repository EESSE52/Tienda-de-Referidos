from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

import requests


def upload_products(
    products: List[Dict[str, Any]],
    site_url: str,
    *,
    email: Optional[str] = None,
    auth_token: Optional[str] = None,
    cookie: Optional[str] = None,
    timeout: int = 30,
) -> Dict[str, Any]:
    if not site_url:
        raise ValueError("Debes indicar SITE_URL.")

    endpoint = site_url.rstrip("/") + "/api/admin/products/import"
    headers = {"Content-Type": "application/json"}

    if email:
        headers["Cf-Access-Authenticated-User-Email"] = email
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    if cookie:
        headers["Cookie"] = cookie

    response = requests.post(endpoint, json=products, headers=headers, timeout=timeout)
    try:
        payload = response.json()
    except ValueError:
        payload = {"raw": response.text}

    result = {
        "status_code": response.status_code,
        "url": endpoint,
        "payload": payload,
    }

    if response.status_code >= 400:
        raise RuntimeError(f"Error al subir al sitio: {json.dumps(payload, ensure_ascii=False)}")

    return result


def load_products_from_file(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("products"), list):
        return data["products"]
    raise ValueError("El archivo JSON debe contener una lista de productos.")


def load_env_or_default() -> Dict[str, str]:
    return {
        "SITE_URL": os.getenv("SITE_URL", ""),
        "CF_ACCESS_AUTHENTICATED_USER_EMAIL": os.getenv("CF_ACCESS_AUTHENTICATED_USER_EMAIL", ""),
        "CF_ACCESS_TOKEN": os.getenv("CF_ACCESS_TOKEN", ""),
        "CF_ACCESS_COOKIE": os.getenv("CF_ACCESS_COOKIE", ""),
    }
