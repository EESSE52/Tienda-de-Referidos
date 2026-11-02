import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { oauthTestSettings } from '../../../../../lib/mercadolibre-oauth-test.js';

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  const status = oauthTestSettings(env, request.url);
  return jsonResponse({ oauth_pruebas: status.ready === true, mensaje: status.ready ? 'OAuth de pruebas configurado.' : status.reason });
};
