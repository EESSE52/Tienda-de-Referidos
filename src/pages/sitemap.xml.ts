// Sitemap generado a partir de las categorías y productos (sin dependencias extra).
import type { APIRoute } from 'astro';
import { categorias } from '../config/categorias';
import { productos } from '../lib/productos';

export const GET: APIRoute = ({ site }) => {
  const rutas = [
    '/',
    ...categorias.map((c) => `/${c.slug}/`),
    ...productos.map((p) => `/${p.categoria}/${p.id}/`),
    '/comparar/',
    '/como-comparamos/',
    '/aviso-afiliados/',
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rutas.map((r) => `  <url><loc>${new URL(r, site).href}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
