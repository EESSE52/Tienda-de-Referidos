from __future__ import annotations

import argparse
import os
import webbrowser
from tkinter import END, StringVar, Text, Tk, messagebox
from tkinter import ttk

from cli import load_urls_from_file
from extractor import build_payloads_from_urls, normalize_url, save_json
from uploader import load_env_or_default, upload_products


class ExtractorApp:
    def __init__(self, root: Tk) -> None:
        self.root = root
        self.root.title("Tienda de Referidos - Extractor")
        self.root.geometry("980x760")
        self.root.minsize(900, 620)

        self.products: list[dict] = []
        self.style = ttk.Style(root)
        self.style.theme_use("clam")
        self.style.configure("Card.TFrame", background="#f4f7fb")
        self.style.configure("Accent.TButton", background="#16a34a", foreground="white", font=("Segoe UI", 10, "bold"))
        self.style.map("Accent.TButton", background=[("active", "#15803d")])
        self.style.configure("Secondary.TButton", font=("Segoe UI", 10, "bold"))
        self.style.configure("Title.TLabel", font=("Segoe UI", 16, "bold"), foreground="#0f172a")
        self.style.configure("Muted.TLabel", foreground="#475569")

        self.header = ttk.Frame(root, padding=16)
        self.header.pack(fill="x")
        ttk.Label(self.header, text="Extractor de productos y enlaces", style="Title.TLabel").pack(anchor="w")
        ttk.Label(self.header, text="Genera un JSON listo para cargar en la web de Cloudflare.", style="Muted.TLabel").pack(anchor="w", pady=(4, 0))

        form = ttk.Frame(root, padding=(16, 10, 16, 8))
        form.pack(fill="x")

        ttk.Label(form, text="Lista ID").grid(row=0, column=0, sticky="w", padx=(0, 12), pady=8)
        self.lista_var = StringVar(value="creatina")
        self.lista_entry = ttk.Entry(form, textvariable=self.lista_var, width=30)
        self.lista_entry.grid(row=0, column=1, sticky="ew", pady=8)

        ttk.Label(form, text="Ruta salida JSON").grid(row=1, column=0, sticky="w", padx=(0, 12), pady=8)
        self.output_var = StringVar(value="python-extractor/output/productos.json")
        self.output_entry = ttk.Entry(form, textvariable=self.output_var, width=30)
        self.output_entry.grid(row=1, column=1, sticky="ew", pady=8)

        ttk.Label(form, text="Archivo con URLs").grid(row=2, column=0, sticky="w", padx=(0, 12), pady=8)
        self.file_var = StringVar(value="python-extractor/urls_ejemplo.txt")
        self.file_entry = ttk.Entry(form, textvariable=self.file_var, width=30)
        self.file_entry.grid(row=2, column=1, sticky="ew", pady=8)

        buttons = ttk.Frame(form)
        buttons.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        ttk.Button(buttons, text="Ejemplo", command=self.load_sample, style="Secondary.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(buttons, text="Extraer JSON", command=self.run_extraction, style="Accent.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(buttons, text="Subir a Cloudflare", command=self.upload_products, style="Secondary.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(buttons, text="Abrir admin", command=self.open_admin, style="Secondary.TButton").pack(side="left")

        form.columnconfigure(1, weight=1)

        urls_panel = ttk.Frame(root, padding=(16, 0, 16, 10))
        urls_panel.pack(fill="both", expand=True)
        ttk.Label(urls_panel, text="URLs a procesar").pack(anchor="w", pady=(0, 6))
        self.urls_box = Text(urls_panel, height=12, wrap="word", bg="#f8fafc", fg="#0f172a", font=("Segoe UI", 10))
        self.urls_box.pack(fill="both", expand=True)

        preview_panel = ttk.Frame(root, padding=(16, 0, 16, 10))
        preview_panel.pack(fill="both", expand=True)
        ttk.Label(preview_panel, text="Vista previa de productos").pack(anchor="w", pady=(0, 6))
        columns = ("nombre", "marca", "precio", "lista")
        self.tree = ttk.Treeview(preview_panel, columns=columns, show="headings", height=8)
        for col in columns:
            self.tree.heading(col, text={"nombre": "Nombre", "marca": "Marca", "precio": "Precio", "lista": "Lista"}[col])
            self.tree.column(col, width=180, anchor="w")
        self.tree.pack(fill="both", expand=True)

        self.log = Text(root, height=9, wrap="word", bg="#0f172a", fg="#e2e8f0", font=("Consolas", 9))
        self.log.pack(fill="x", padx=16, pady=(0, 14))

    def log_message(self, message: str) -> None:
        self.log.insert(END, message + "\n")
        self.log.see(END)

    def clear_preview(self) -> None:
        for row in self.tree.get_children():
            self.tree.delete(row)

    def render_preview(self) -> None:
        self.clear_preview()
        for product in self.products:
            nombre = str(product.get("nombre") or "Sin nombre")
            marca = str(product.get("marca") or "Sin marca")
            precio = str(product.get("precio") or 0)
            lista = str(product.get("lista_id") or self.lista_var.get())
            self.tree.insert("", END, values=(nombre, marca, precio, lista))

    def load_sample(self) -> None:
        self.urls_box.delete("1.0", END)
        sample = "https://www.mercadolibre.cl/creatina-monohidratada-300g/MLC123456789\nhttps://www.mercadolibre.cl/proteina-whey-900g/MLC987654321\n"
        self.urls_box.insert(END, sample)
        self.log_message("Ejemplo cargado.")

    def open_admin(self) -> None:
        env_data = load_env_or_default()
        admin_url = env_data.get("SITE_URL", "https://tu-sitio.pages.dev")
        target = f"{admin_url.rstrip('/')}/admin/"
        self.log_message(f"Abriendo el panel de administración: {target}")
        webbrowser.open(target)

    def run_extraction(self) -> None:
        lista_id = self.lista_var.get().strip() or "creatina"
        raw_urls = self.urls_box.get("1.0", END).splitlines()
        file_path = self.file_var.get().strip()
        if file_path and os.path.exists(file_path):
            raw_urls.extend(load_urls_from_file(file_path))

        url_list = [normalize_url(item) for item in raw_urls if item.strip()]
        if not url_list:
            self.log_message("No se detectaron URLs válidas.")
            return

        try:
            payload = build_payloads_from_urls(url_list, lista_id)
            destination = save_json(payload, self.output_var.get().strip() or "python-extractor/output/productos.json")
            self.products = payload
            self.render_preview()
            self.log_message(f"Se generaron {len(payload)} productos e importaron a: {destination}")
        except Exception as exc:
            self.log_message(f"Error: {exc}")
            self.products = []
            self.clear_preview()

    def upload_products(self) -> None:
        if not self.products:
            self.log_message("Primero genera el JSON con la extracción.")
            return

        env_data = load_env_or_default()
        site_url = env_data.get("SITE_URL")
        if not site_url:
            self.log_message("Falta SITE_URL en el entorno. Añádelo en .env o usa la variable del sistema.")
            return

        try:
            result = upload_products(
                self.products,
                site_url,
                email=env_data.get("CF_ACCESS_AUTHENTICATED_USER_EMAIL") or None,
                auth_token=env_data.get("CF_ACCESS_TOKEN") or None,
            )
            self.log_message(f"Subida completada: {result['status_code']} -> {site_url}")
            self.log_message(str(result['payload']))
        except Exception as exc:
            self.log_message(f"Error al subir: {exc}")


def parse_cli_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extractor local de productos para la tienda de referidos.")
    parser.add_argument("--lista", default="creatina")
    parser.add_argument("--url", action="append", default=[], help="URL de Mercado Libre")
    parser.add_argument("--file", help="Archivo txt con URLs")
    parser.add_argument("--output", default="python-extractor/output/productos.json")
    return parser.parse_args()


def run_cli() -> None:
    import argparse
    args = parse_cli_args()
    urls = [normalize_url(item) for item in args.url]
    if args.file and os.path.exists(args.file):
        urls.extend(load_urls_from_file(args.file))
    if not urls:
        raise SystemExit("Debes indicar --url o --file.")
    payload = build_payloads_from_urls(urls, args.lista)
    output = save_json(payload, args.output)
    print(f"Exportado: {output} | productos: {len(payload)}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        run_cli()
    else:
        root = Tk()
        app = ExtractorApp(root)
        root.mainloop()
