import type { APIRoute } from 'astro';
import { listas, productos } from '../lib/catalog';

export const GET: APIRoute = () => {
  const site = 'https://dmonkesport.example';
  const urls = [
    '',
    '/metodologia',
    ...listas.map((lista) => `/lista/${lista.slug}`),
    ...productos.map((producto) => `/producto/${producto.id}`),
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
