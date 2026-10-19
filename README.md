# Dmonkesport

Sitio estático en español (Chile) que compara productos deportivos con enlaces de afiliado de Mercado Libre.
Stack: Astro + TypeScript, CSS propio, Vitest (solo cálculos, desde el paso 2). Sin backend ni base de datos.

## Uso

```bash
npm install
npm run dev       # servidor local en http://localhost:4321
npm run build     # genera el sitio estático en dist/
npm run preview   # sirve dist/ localmente
npm test          # pruebas Vitest de los cálculos
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

## Datos y categorías

- Los productos viven en `data/productos.json` (los actuales son ficticios: `notas` dice "EJEMPLO – reemplazar"; reemplaza también `enlace_referido`).
- Para agregar una categoría, edita solo `src/config/categorias.ts` y agrega productos al JSON; las páginas se generan solas.
- Si una métrica nueva es necesaria, agrégala en `src/lib/calculos.ts`.
- La advertencia de precio de más de 14 días se evalúa al construir y también al abrir la página.
- `sitemap.xml` y `robots.txt` se generan con `SITE_URL`.

### Si Cloudflare muestra "Could not detect a directory containing static files"

El proyecto se creó como Workers Builds y solo ejecutó `npx wrangler deploy`. Hay dos cosas:
- `wrangler.jsonc` (incluido en el repo) indica que los archivos estáticos están en `dist`.
- En Settings → Build, define **Build command** = `npm run build` y **Deploy command** = `npx wrangler deploy`. Sin build command, `dist` no existe y el deploy falla.
