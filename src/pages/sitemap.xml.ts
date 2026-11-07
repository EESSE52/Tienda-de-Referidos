import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadCatalog } from '../lib/catalog';

export const GET: APIRoute = async () => {
  const site = 'https://dmonkeysport.com';
  const catalog = await loadCatalog(env?.CATALOG_DB);
  const listasActivas = catalog.listas.filter((lista) => lista.activa !== false);
  const productosActivos = catalog.productos.filter((producto) => producto.activo);
  const urls = [
    '',
    '/como-comparamos',
    '/aviso-afiliados',
    '/metodologia',
    ...listasActivas.map((lista) => `/lista/${lista.slug}`),
    ...productosActivos.map((producto) => `/producto/${producto.id}`),
    '/comparador',
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls
      .map((path) => `
      <url>
        <loc>${site}${path}</loc>
      </url>`)
      .join('')}
  </urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
