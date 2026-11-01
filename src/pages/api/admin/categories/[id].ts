import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readJsonBody, requireAdmin } from '../../../../lib/cloudflare-catalog.js';
import { updateAdminCategory, categoryErrorResponse } from '../../../../lib/admin-categories.js';

export const prerender = false;

export const PUT: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const category = await updateAdminCategory(env, params.id ?? '', await readJsonBody(request));
    return jsonResponse({ ok: true, categoria: category });
  } catch (error) { return categoryErrorResponse(error, jsonResponse); }
};
