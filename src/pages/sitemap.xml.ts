import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadCatalog } from '../lib/catalog';
import { getPublishedGuides } from '../lib/seo-guides.js';
import { publicSitemapPaths, renderSitemapXml } from '../lib/seo-sitemap.js';

export const prerender = false;
export const GET: APIRoute = async () => {
  const catalog = await loadCatalog(env?.CATALOG_DB);
  const guides = await getPublishedGuides(env?.CATALOG_DB);
  const xml = renderSitemapXml([...publicSitemapPaths(catalog), '/guias', ...guides.map(g => '/guias/' + encodeURIComponent(g.slug))]);
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
