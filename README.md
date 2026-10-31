# Tienda de Referidos

Documentación principal del proyecto.

## Índice

- [docs/README.md](docs/README.md): documentación general del proyecto
- [docs/admin-local.md](docs/admin-local.md): flujo local del admin y procesos de importación

## Resumen

Proyecto de tienda de productos referidos con:

- Astro para la parte pública
- panel administrativo local para manejo de catálogo
- soporte para carga de CSV/XLSX
- flujo de publicación en Cloudflare Workers + D1

## Arranque rápido

### Sitio público

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4321
```

### Admin local

```bash
node scripts/admin-server.mjs
```

O directamente:

```bash
npm run admin
```

URLs esperadas:

- Sitio público: http://127.0.0.1:4321/
- Admin: http://127.0.0.1:4322/admin

## Flujo recomendado

1. Crear o ajustar listas.
2. Importar productos en CSV/XLSX desde el admin local.
3. Validar nombre, precio, enlace y lista de destino.
4. Revisar la publicación del catálogo.
5. Desplegar la versión final en Cloudflare.

## Nota importante

La extracción automática desde Mercado Libre puede quedar bloqueada por restricciones del proveedor externo. Por eso, el flujo estable y recomendado del proyecto es la importación manual local con validación del admin.

## Documentación ampliada

- [docs/README.md](docs/README.md)
- [docs/admin-local.md](docs/admin-local.md)
