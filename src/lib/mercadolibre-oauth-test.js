/** Preparación OAuth sin intercambio de tokens ni modificaciones de producción. */
export const ML_OAUTH_COOKIE = 'dms_ml_oauth_state';
export const ML_OAUTH_CALLBACK_PATH = '/api/admin/mercadolibre/oauth/callback';

export function oauthTestSettings(env, requestUrl) {
  const vars = env ?? {};
  if (vars.ML_OAUTH_TEST_MODE !== 'enabled') return { ready: false, reason: 'La prueba OAuth está deshabilitada. Configura ML_OAUTH_TEST_MODE=enabled solo en un entorno HTTPS de desarrollo.' };
  const redirect = String(vars.ML_OAUTH_REDIRECT_URI ?? '').trim();
  const clientId = String(vars.ML_CLIENT_ID ?? '').trim();
  if (!clientId || !redirect) return { ready: false, reason: 'Faltan ML_CLIENT_ID o ML_OAUTH_REDIRECT_URI en los secretos de desarrollo.' };
  let req, uri;
  try { req = new URL(requestUrl); uri = new URL(redirect); } catch { return { ready: false, reason: 'Configuración OAuth inválida.' }; }
  if (req.protocol !== 'https:' || uri.protocol !== 'https:' || req.origin !== uri.origin ||
    uri.pathname !== ML_OAUTH_CALLBACK_PATH || uri.search || uri.hash ||
    ['dmonkeysport.com', 'www.dmonkeysport.com'].includes(req.hostname.toLowerCase())) {
    return { ready: false, reason: 'OAuth de pruebas requiere una URL HTTPS del mismo origen, con ruta de retorno fija, fuera del dominio de producción.' };
  }
  return { ready: true, redirect, clientId };
}

export function createMlOauthStart(env, requestUrl, randomBytes) {
  const settings = oauthTestSettings(env, requestUrl);
  if (!settings.ready) return settings;
  if (!(randomBytes instanceof Uint8Array) || randomBytes.length < 32) throw new Error('Se requiere aleatoriedad criptográfica.');
  const state = Array.from(randomBytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
  const authorization = new URL('https://auth.mercadolibre.cl/authorization');
  authorization.searchParams.set('response_type', 'code');
  authorization.searchParams.set('client_id', settings.clientId);
  authorization.searchParams.set('redirect_uri', settings.redirect);
  authorization.searchParams.set('state', state);
  return {
    ready: true,
    authorizationUrl: authorization.href,
    stateCookie: ML_OAUTH_COOKIE + '=' + state + '; Path=' + ML_OAUTH_CALLBACK_PATH + '; Max-Age=600; Secure; HttpOnly; SameSite=Lax',
  };
}

export function checkMlOauthCallback(env, requestUrl, cookieHeader) {
  const settings = oauthTestSettings(env, requestUrl);
  if (!settings.ready) return { ok: false, status: 503, message: settings.reason };
  const url = new URL(requestUrl);
  const error = url.searchParams.get('error');
  if (error) return { ok: false, status: 400, message: 'Mercado Libre no autorizó la conexión.' };
  const returnedState = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  const cookie = String(cookieHeader || '').split(';').map(item => item.trim()).find(item => item.startsWith(ML_OAUTH_COOKIE + '='));
  const savedState = cookie ? cookie.slice(ML_OAUTH_COOKIE.length + 1) : '';
  if (!/^[a-f0-9]{64,}$/.test(returnedState) || returnedState !== savedState ||
      code.length < 8 || code.length > 2048) {
    return { ok: false, status: 400, message: 'Retorno OAuth inválido o expirado. Reinicia la autorización desde el administrador.' };
  }
  return { ok: true, status: 200, message: 'Retorno OAuth comprobado. Esta fase no intercambia ni almacena tokens: falta conectar el almacenamiento seguro y la renovación.' };
}

export const clearMlOauthCookie = ML_OAUTH_COOKIE + '=; Path=' + ML_OAUTH_CALLBACK_PATH + '; Max-Age=0; Secure; HttpOnly; SameSite=Lax';
