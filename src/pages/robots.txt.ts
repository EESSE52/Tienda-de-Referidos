import type { APIRoute } from 'astro';
import { SITE_ORIGIN } from '../lib/seo-sitemap.js';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};
