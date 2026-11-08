import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin, readJsonBody } from '../../../../../lib/cloudflare-catalog.js';
import { registerManualPriceReview } from '../../../../../lib/price-manual-review.js';
import { PriceReviewError } from '../../../../../lib/price-review.js';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const result = await registerManualPriceReview(env, params.id ?? '', await readJsonBody(request));
    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    if (error instanceof PriceReviewError) return jsonResponse({ error: error.message }, error.status);
    console.error('Error al guardar revisión manual de precio:', error);
    return jsonResponse({ error: 'No se pudo guardar la revisión manual.' }, 500);
  }
};
