import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin, readCatalog } from '../../../lib/cloudflare-catalog.js';
import { displayAnalytics } from '../../../lib/analytics.js';

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  const daysRaw = Number(new URL(request.url).searchParams.get('days') || 30);
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0,10);
  try {
    const [catalog, data] = await Promise.all([
      readCatalog(env),
      env.CATALOG_DB.prepare(`
        SELECT product_id,event_type,SUM(count) AS total
        FROM analytics_daily WHERE day >= ?
        GROUP BY product_id,event_type
      `).bind(since).all(),
    ]);
    return jsonResponse({ ok: true, ...displayAnalytics(data.results || [], catalog, days) });
  } catch {
    return jsonResponse({
      error: 'Las estadísticas aún no están disponibles. Comprueba que la migración local 0002_analytics_daily.sql se haya aplicado al catálogo.',
    }, 503);
  }
};
