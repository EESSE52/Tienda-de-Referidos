import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readJsonBody, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { previewPriceChange, confirmPriceChange, PriceReviewError } from '../../../../../lib/price-review.js';

export const prerender = false;

function handleError(error: unknown) {
  if (error instanceof PriceReviewError) return jsonResponse({ error: error.message }, error.status);
  const message = error instanceof Error ? error.message : String(error);
  if (/Mercado Libre.*(?:403|401|restricci[oó]n de acceso|token API)/i.test(message)) {
    // Proveedor externo: informar la causa real sin simular un precio actualizado.
    return jsonResponse({
      error: 'Mercado Libre no autorizó la consulta automática (401/403). No se cambió ningún precio. Comprueba el valor en la publicación y utiliza Editar oferta para registrarlo manualmente, o configura acceso oficial autorizado.',
      codigo: 'ML_API_ACCESS_DENIED',
    }, 424);
  }
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
