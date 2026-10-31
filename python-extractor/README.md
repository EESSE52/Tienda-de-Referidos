# Extractor local de productos para Tienda de Referidos

Este proyecto está pensado para que lo ejecutes en tu PC y te ayude a:

- extraer información de enlaces de Mercado Libre
- normalizar los datos
- generar un JSON listo para cargar en la tienda
- opcionalmente subirlo a la web publicada en Cloudflare

## Estructura

- `main.py`: aplicación gráfica con Tkinter
- `cli.py`: versión por línea de comandos
- `extractor.py`: lógica de extracción y normalización
- `uploader.py`: envío del JSON a la API de administración
- `output/`: carpeta donde se guardan los archivos generados

## Instalación

1. Abre una terminal en la carpeta del proyecto.
2. Crea un entorno virtual si quieres:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Instala dependencias:

```bash
pip install -r python-extractor/requirements.txt
```

## Ejecutar la app gráfica

```bash
python3 python-extractor/main.py
```

## Ejecutar por línea de comandos

```bash
python3 python-extractor/cli.py --lista creatina --url "https://www.mercadolibre.cl/tu-producto/MLC123456789"
```

O con varios enlaces:

```bash
python3 python-extractor/cli.py --lista creatina --url "https://.../MLC123456789" --url "https://.../MLC987654321" --output python-extractor/output/productos.json
```

## Subir a Cloudflare

Primero crea un archivo `.env` basado en `.env.example`:

```bash
cp python-extractor/.env.example python-extractor/.env
```

Luego rellena:

- `SITE_URL`: URL de tu sitio publicado
- `CF_ACCESS_AUTHENTICATED_USER_EMAIL`: email del admin configurado en Cloudflare Access
- `CF_ACCESS_TOKEN` o `CF_ACCESS_COOKIE`: si tu sitio usa autorización

Y sube con:

```bash
python3 python-extractor/cli.py --lista creatina --file python-extractor/urls_ejemplo.txt --upload
```

## Importante

Si el sitio está protegido por Cloudflare Access, la subida directa desde tu PC solo funcionará si tienes:

- un email autorizado configurado
- una sesión válida o token que el sitio acepte

En muchos casos la forma más segura es:

1. generar el JSON localmente
2. revisarlo y validarlo
3. subirlo desde el admin web autenticado en Cloudflare

Eso es lo que mejor encaja con el flujo actual del proyecto.
