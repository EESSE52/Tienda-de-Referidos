# Dmonkesport

Sitio estático en español (Chile) que compara productos deportivos con enlaces de afiliado de Mercado Libre.
Stack: Astro + TypeScript, CSS propio, Vitest (solo cálculos, desde el paso 2). Sin backend ni base de datos.

## Uso

```bash
npm install
npm run dev       # servidor local en http://localhost:4321
npm run build     # genera el sitio estático en dist/
npm run preview   # sirve dist/ localmente
```

## Variables de entorno

| Variable   | Por defecto                    | Uso                              |
|------------|--------------------------------|----------------------------------|
| `SITE_URL` | `https://dmonkesport.pages.dev` | URL pública (sitemap, SEO, OG)  |

Nunca guardes tokens ni claves en el código; el archivo `.env` está en `.gitignore`.

## Estructura

```
data/productos.json     datos de productos
src/config/             configuración de categorías
src/lib/                funciones de cálculo
src/layouts/            layouts
src/components/         componentes
src/pages/              páginas
public/                 archivos estáticos
tests/                  pruebas Vitest
```

## Despliegue en Cloudflare Pages

1. En el panel de Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
2. Autoriza GitHub y elige este repositorio.
3. Configuración de build:
   - Framework preset: **Astro** (o ninguno)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. En **Environment variables** agrega `SITE_URL` con tu URL final (opcional).
5. Pulsa **Save and Deploy**. Cada push a la rama principal redespliega el sitio.
