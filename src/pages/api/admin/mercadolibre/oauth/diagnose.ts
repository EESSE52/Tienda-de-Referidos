import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { oauthTestSettings } from '../../../../../lib/mercadolibre-oauth-test.js';
import { oauthStorageReady, readMlTokens } from '../../../../../lib/mercadolibre-token-store.js';
import { diagnoseMercadoLibreAccess } from '../../../../../lib/mercadolibre-diagnostic.js';

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  const vars = env as unknown as Record<string, unknown>;
  if (!oauthTestSettings(vars, request.url).ready || !oauthStorageReady(vars)) {
    return jsonResponse({ error: 'El diagnóstico solo está disponible en el Worker OAuth aislado.' }, 503);
  }
  const itemId = new URL(request.url).searchParams.get('item')?.trim().toUpperCase() || '';
  if (itemId && !/^MLC[0-9]{6,}$/.test(itemId)) {
    return jsonResponse({ error: 'Introduce un ID MLC de publicación válido.' }, 400);
  }
  try {
    const stored = await readMlTokens(vars);
    if (!stored) return jsonResponse({ error: 'No hay una autorización OAuth guardada.' }, 409);
    if (stored.expires_at <= Date.now()) return jsonResponse({ error: 'El token ha expirado. Renuévalo desde el administrador.' }, 409);
    return jsonResponse(await diagnoseMercadoLibreAccess(stored.access_token, itemId));
  } catch {
    return jsonResponse({ error: 'No fue posible completar el diagnóstico. Revisa las autorizaciones del Worker de pruebas.' }, 502);
  }
};
