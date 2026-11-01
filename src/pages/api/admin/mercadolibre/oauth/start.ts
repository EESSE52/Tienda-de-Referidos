import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { createMlOauthStart } from '../../../../../lib/mercadolibre-oauth-test.js';

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  const data = createMlOauthStart(env, request.url, crypto.getRandomValues(new Uint8Array(32)));
  if (!data.ready) return jsonResponse({ error: data.reason }, 503);
  const response = jsonResponse({ authorization_url: data.authorizationUrl, message: 'Prueba de retorno OAuth. No se guardarán tokens.' });
  response.headers.append('Set-Cookie', data.stateCookie);
  return response;
};
