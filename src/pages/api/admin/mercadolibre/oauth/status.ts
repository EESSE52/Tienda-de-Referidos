import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { mlTokenStatus } from '../../../../../lib/mercadolibre-token-store.js';
import { oauthTestSettings } from '../../../../../lib/mercadolibre-oauth-test.js';

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  const vars = env as unknown as Record<string, unknown>;
  const status = oauthTestSettings(vars, request.url);
  if (!status.ready) return jsonResponse({ oauth_pruebas: false, mensaje: status.reason });
  try {
    const tokens = await mlTokenStatus(vars);
    return jsonResponse({ oauth_pruebas: true, tokens });
  } catch {
    return jsonResponse({ oauth_pruebas: true, tokens: { configured: true, authorized: false }, error: 'No fue posible leer el estado OAuth.' }, 503);
  }
};
