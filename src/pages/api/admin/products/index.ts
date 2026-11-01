import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  jsonResponse,
  readCatalog,
  requireAdmin,
} from '../../../../lib/cloudflare-catalog.js';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;

  try {
    const catalog = await readCatalog(env);
    return jsonResponse({
      ok: true,
      total: catalog.productos.length,
      productos: catalog.productos,
    });
  } catch (error) {
    console.error('Error consultando productos D1:', error);
    return jsonResponse({ error: 'No fue posible consultar el catálogo.' }, 500);
  }
};
