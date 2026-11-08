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
      ultima_revision: product.ultima_revision ?? null,
      revisiones_manuales: Array.isArray(product.historial_revisiones)
        ? product.historial_revisiones.filter((entry: { fuente?: string; fecha?: string; precio_observado?: number }) =>
            entry?.fuente === 'mercadolibre_manual'
            && /^\d{4}-\d{2}-\d{2}$/.test(String(entry.fecha ?? ''))
            && Number.isSafeInteger(Number(entry.precio_observado))
            && Number(entry.precio_observado) > 0).slice(-50)
        : [],
      ...summarizePriceHistory(product),
    });
  } catch (error) {
    return adminProductErrorResponse(error, jsonResponse);
  }
};
