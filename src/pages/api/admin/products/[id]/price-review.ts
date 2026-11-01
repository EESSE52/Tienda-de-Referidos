import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readJsonBody, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { previewPriceChange, confirmPriceChange, PriceReviewError } from '../../../../../lib/price-review.js';

export const prerender = false;

function handleError(error: unknown) {
  if (error instanceof PriceReviewError) return jsonResponse({ error: error.message }, error.status);
  console.error('Consulta de precio Mercado Libre:', error);
  return jsonResponse({ error: 'No se pudo completar la revisión del precio. Verifica el acceso a Mercado Libre.' }, 502);
}

export const GET: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const revision = await previewPriceChange(env, params.id ?? '');
    return jsonResponse({ ok: true, revision });
  } catch (error) { return handleError(error); }
};

export const POST: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const result = await confirmPriceChange(env, params.id ?? '', await readJsonBody(request));
    return jsonResponse({ ok: true, ...result });
  } catch (error) { return handleError(error); }
};
