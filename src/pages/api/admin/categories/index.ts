import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readCatalog, readJsonBody, requireAdmin } from '../../../../lib/cloudflare-catalog.js';
import { createAdminCategory, categoryErrorResponse } from '../../../../lib/admin-categories.js';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const catalog = await readCatalog(env);
    return jsonResponse({ ok: true, total: catalog.listas.length, categorias: catalog.listas });
  } catch (error) { return categoryErrorResponse(error, jsonResponse); }
};

export const POST: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const category = await createAdminCategory(env, await readJsonBody(request));
    return jsonResponse({ ok: true, categoria: category }, 201);
  } catch (error) { return categoryErrorResponse(error, jsonResponse); }
};
