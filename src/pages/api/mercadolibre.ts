import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../lib/cloudflare-catalog.js';
import { fetchMercadoLibreItem } from '../../lib/mercadolibre.js';
import { fetchChileCatalogOffer } from '../../lib/mercadolibre-catalog-offer.js';
import { resolveChileMercadoLibreUrl } from '../../lib/mercadolibre-review.js';

export const GET: APIRoute = async (context) => {
  const denied = requireAdmin({ env, request: context.request });
  if (denied) return denied;

  const url = new URL(context.request.url);
  const productUrl = url.searchParams.get('url');

  if (!productUrl) {
    return jsonResponse({ error: 'Falta la URL de Mercado Libre.' }, 400);
  }

  try {
    const source = await resolveChileMercadoLibreUrl(productUrl);
    const configuredToken = (env as unknown as Record<string, unknown>)?.ML_ACCESS_TOKEN;
    const accessToken = typeof configuredToken === 'string' ? configuredToken.trim() : '';
    if (source.kind === 'catalog') {
      return jsonResponse(await fetchChileCatalogOffer(source, fetch, fetchMercadoLibreItem, accessToken));
    }
    const item = await fetchMercadoLibreItem(source.id, fetch, accessToken);
    return jsonResponse({ ...item, id_publicacion: source.id, url_publicacion: source.url, afiliado_verificado: false });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'No se pudo obtener la publicación de Mercado Libre.',
    }, 400);
  }
};
