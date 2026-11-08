import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateAnalyticsEvent } from '../../../lib/analytics.js';
import { readCatalog } from '../../../lib/cloudflare-catalog.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Sin cookies ni datos de dispositivo: solo conteos agregados.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 1024) return new Response(null, { status: 413 });
  let data;
  try { data = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const item = validateAnalyticsEvent(data);
  if (!item) return new Response(null, { status: 400 });
  try {
    const catalog = await readCatalog(env);
    const product = catalog.productos.find(p => p.id === item.productId);
    if (!product || product.activo !== true || product.es_prueba === true)
      return new Response(null, { status: 204 });
    if (item.event === 'affiliate_click' && !/^https:\/\//i.test(String(product.enlace_referido || '')))
      return new Response(null, { status: 204 });
    const today = new Date().toISOString().slice(0,10);
    await env.CATALOG_DB.prepare(`
      INSERT INTO analytics_daily (day,event_type,product_id,category_id,seller,placement,count)
      VALUES (?,?,?,?,?,?,1)
      ON CONFLICT(day,event_type,product_id,placement) DO UPDATE SET count=count+1
    `).bind(today, item.event, product.id, product.lista_id,
      String(product.vendedor_nombre || product.vendedor || '').slice(0,150), item.placement).run();
  } catch {
    // Si la migración D1 aún no está aplicada, la tienda y los enlaces no se bloquean.
    return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 204 });
};
