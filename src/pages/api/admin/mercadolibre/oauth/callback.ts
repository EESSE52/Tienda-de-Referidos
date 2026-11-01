import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkMlOauthCallback, clearMlOauthCookie } from '../../../../../lib/mercadolibre-oauth-test.js';

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  // Nunca imprimir ni registrar el code o el state recibido.
  const result = checkMlOauthCallback(env, request.url, request.headers.get('cookie'));
  const response = new Response(result.message, {
    status: result.status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Set-Cookie': clearMlOauthCookie,
    },
  });
  return response;
};
