import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkMlOauthCallback, clearMlOauthCookie } from '../../../../../lib/mercadolibre-oauth-test.js';
import { oauthStorageReady, exchangeMlCode } from '../../../../../lib/mercadolibre-token-store.js';

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  // Nunca registrar ni devolver el code, state o los tokens.
  const vars = env as unknown as Record<string, unknown>;
  const result = checkMlOauthCallback(vars, request.url, request.headers.get('cookie'));
  let message = result.message;
  let status = result.status;
  if (result.ok && oauthStorageReady(vars)) {
    try {
      const code = new URL(request.url).searchParams.get('code') || '';
      await exchangeMlCode(vars, code, String(vars.ML_OAUTH_REDIRECT_URI));
      message = 'Mercado Libre conectado. Los tokens se guardaron cifrados en el almacenamiento exclusivo de pruebas. Puedes cerrar esta pestaña.';
    } catch {
      message = 'No se pudo completar el intercambio OAuth o guardar las credenciales. Revisa la configuración del Worker y vuelve a autorizar.';
      status = 502;
    }
  } else if (result.ok) {
    message = 'Retorno OAuth validado, pero falta configurar el almacenamiento privado y el secreto de la aplicación. No se intercambió el código ni se guardaron tokens.';
  }
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': clearMlOauthCookie,
    },
  });
};
