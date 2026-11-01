import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readJsonBody, requireAdmin } from '../../../../lib/cloudflare-catalog.js';
import {
  getAdminProduct,
  updateAdminProduct,
  deactivateAdminProduct,
  adminProductErrorResponse,
} from '../../../../lib/admin-products.js';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const producto = await getAdminProduct(env, params.id ?? '');
    return jsonResponse({ ok: true, producto });
  } catch (error) {
    return adminProductErrorResponse(error, jsonResponse);
  }
};

export const PUT: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const producto = await updateAdminProduct(env, params.id ?? '', await readJsonBody(request));
    return jsonResponse({ ok: true, producto });
  } catch (error) {
    return adminProductErrorResponse(error, jsonResponse);
  }
};

// Desactivar en vez de borrar: se preservan registros y enlaces para auditoría.
export const DELETE: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const producto = await deactivateAdminProduct(env, params.id ?? '');
    return jsonResponse({ ok: true, producto, desactivado: true });
  } catch (error) {
    return adminProductErrorResponse(error, jsonResponse);
  }
};
