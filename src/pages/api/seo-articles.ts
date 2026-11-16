import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validGuideSlug } from '../../lib/seo-guides.js';
export const prerender = false;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const text = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
async function authorized(request: Request) {
  const expected = String(env?.SEO_ADMIN_TOKEN ?? '');
  const received = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (expected.length < 32 || !received || received.length !== expected.length) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(received))
  ]);
  let mismatch = 0;
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  for (let i = 0; i < aa.length; i++) mismatch |= aa[i] ^ bb[i];
  return mismatch === 0;
}
export const GET: APIRoute = async ({ request }) => {
  if (!(await authorized(request))) return json({ error: 'Acceso no autorizado' }, 401);
  if (!env?.CATALOG_DB?.prepare) return json({ error: 'Base de datos D1 no configurada' }, 503);
  try {
    const rows = await env.CATALOG_DB.prepare('SELECT slug,title,description,category,list_slug AS listSlug,body,status,updated_at AS updatedAt FROM seo_articles ORDER BY updated_at DESC').all();
    return json({ articles: rows.results ?? [] });
  } catch { return json({ error: 'Aplicar migración 0003_seo_articles.sql antes de editar' }, 503); }
};
export const POST: APIRoute = async ({ request }) => {
  if (!(await authorized(request))) return json({ error: 'Acceso no autorizado' }, 401);
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Origen no autorizado' }, 403);
  if (!(request.headers.get('Content-Type') ?? '').startsWith('application/json')) return json({ error: 'Se requiere JSON' }, 415);
  if (!env?.CATALOG_DB?.prepare) return json({ error: 'Base de datos D1 no configurada' }, 503);
  const raw = await request.text();
  if (raw.length > 30000) return json({ error: 'Artículo demasiado largo' }, 413);
  let input: Record<string, any>;
  try { input = JSON.parse(raw); } catch { return json({ error: 'JSON no válido' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Entrada no válida' }, 400);
  const slug = text(input.slug, 90), title = text(input.title, 160), description = text(input.description, 260);
  const category = text(input.category, 90), listSlug = text(input.listSlug, 80), body = text(input.body, 24000);
  const status = input.status === 'published' ? 'published' : 'draft';
  if (!validGuideSlug(slug) || !validGuideSlug(listSlug) || title.length < 10 || description.length < 35 || category.length < 2 || body.length < 100) {
    return json({ error: 'Verifica slug, título (10+), descripción (35+), categoría, catálogo y contenido (100+)' }, 400);
  }
  try {
    await env.CATALOG_DB.prepare(`INSERT INTO seo_articles (slug,title,description,category,list_slug,body,status,updated_at)
      VALUES (?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,
      list_slug=excluded.list_slug,body=excluded.body,status=excluded.status,updated_at=datetime('now')`)
      .bind(slug,title,description,category,listSlug,body,status).run();
    return json({ ok: true, slug, status });
  } catch { return json({ error: 'Error de D1: comprueba la migración' }, 503); }
};
