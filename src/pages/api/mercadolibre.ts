import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../lib/cloudflare-catalog.js';
import { fetchMercadoLibreItem } from '../../lib/mercadolibre.js';

export const GET: APIRoute = async (context) => {
  const denied = requireAdmin({ env, request: context.request });
  if (denied) return denied;

  const url = new URL(context.request.url);
  const productUrl = url.searchParams.get('url');

  if (!productUrl) {
    return jsonResponse({ error: 'Falta la URL de Mercado Libre.' }, 400);
  }

  try {
    const item = await fetchMercadoLibreItem(productUrl);
    return jsonResponse(item);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'No se pudo obtener la publicación de Mercado Libre.',
    }, 400);
  }
};
