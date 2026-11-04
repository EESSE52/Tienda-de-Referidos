import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { oauthTestSettings } from '../../../../../lib/mercadolibre-oauth-test.js';
import { mlTokenStatus, refreshMlTokens, oauthStorageReady } from '../../../../../lib/mercadolibre-token-store.js';

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  const vars = env as unknown as Record<string, unknown>;
  if (!oauthTestSettings(vars, request.url).ready || !oauthStorageReady(vars)) {
    return jsonResponse({ error: 'OAuth de pruebas no configurado o almacenamiento no disponible.' }, 503);
  }
  try {
    const current = await mlTokenStatus(vars);
    if (!current.authorized) return jsonResponse({ error: 'Autoriza primero la aplicación de Mercado Libre.' }, 409);
    // Protección adicional: evitar renovar un token que todavía es válido.
    if (!current.expired && Number(current.expires_at) - Date.now() > 60000) {
      return jsonResponse({ ok: true, message: 'Token vigente; no requiere renovación.', tokens: current });
    }
    await refreshMlTokens(vars);
    return jsonResponse({ ok: true, message: 'Token renovado. El nuevo Refresh Token quedó guardado cifrado.', tokens: await mlTokenStatus(vars) });
  } catch {
    return jsonResponse({ error: 'No fue posible renovar el token. Comprueba los permisos y repite la autorización si es necesario.' }, 502);
  }
};
