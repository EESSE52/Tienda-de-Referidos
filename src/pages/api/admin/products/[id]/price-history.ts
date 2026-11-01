import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { getAdminProduct, adminProductErrorResponse } from '../../../../../lib/admin-products.js';
import { summarizePriceHistory } from '../../../../../lib/price-history.js';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const product = await getAdminProduct(env, params.id ?? '');
    return jsonResponse({
      ok: true,
      id: product.id,
      nombre: product.nombre,
      precio_actual: product.precio,
      fecha_precio: product.fecha_precio ?? null,
      ...summarizePriceHistory(product),
    });
  } catch (error) {
    return adminProductErrorResponse(error, jsonResponse);
  }
};
