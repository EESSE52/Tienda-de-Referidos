/** Almacén OAuth exclusivo de pruebas: Cloudflare KV + cifrado AES-GCM con clave Secret. */
const KEY_NAME = 'ml-oauth-v1';

export function oauthStorageReady(env) {
  return Boolean(env?.ML_OAUTH_TEST_MODE === 'enabled' &&
    env?.ML_OAUTH_TOKENS?.get && env?.ML_OAUTH_TOKENS?.put &&
    typeof env?.ML_CLIENT_SECRET === 'string' && env.ML_CLIENT_SECRET.trim() &&
    typeof env?.ML_TOKEN_ENCRYPTION_KEY === 'string' &&
    /^[a-f0-9]{64}$/i.test(env.ML_TOKEN_ENCRYPTION_KEY.trim()));
}

function ensureReady(env) {
  if (!oauthStorageReady(env)) {
    throw new Error('Almacenamiento OAuth de pruebas sin configurar: faltan KV exclusivo, ML_CLIENT_SECRET o ML_TOKEN_ENCRYPTION_KEY.');
  }
}

async function aesKey(env) {
  ensureReady(env);
  const hex = env.ML_TOKEN_ENCRYPTION_KEY.trim();
  const raw = new Uint8Array(hex.match(/../g).map(chunk => parseInt(chunk, 16)));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function encode(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
function decode(hex) {
  if (typeof hex !== 'string' || hex.length % 2 || !/^[a-f0-9]+$/i.test(hex)) throw new Error('Datos cifrados inválidos.');
  return new Uint8Array(hex.match(/../g).map(part => parseInt(part, 16)));
}

export async function saveMlTokens(env, tokenPayload, now = Date.now()) {
  ensureReady(env);
  if (!tokenPayload || typeof tokenPayload.access_token !== 'string' ||
    typeof tokenPayload.refresh_token !== 'string' ||
    !tokenPayload.access_token || !tokenPayload.refresh_token ||
    !Number.isFinite(Number(tokenPayload.expires_in)) || Number(tokenPayload.expires_in) <= 0) {
    throw new Error('Respuesta OAuth incompleta; no se guardaron tokens.');
  }
  const stored = {
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token,
    expires_at: now + Number(tokenPayload.expires_in) * 1000,
    user_id: String(tokenPayload.user_id ?? ''),
    saved_at: now,
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env),
    new TextEncoder().encode(JSON.stringify(stored)));
  await env.ML_OAUTH_TOKENS.put(KEY_NAME, JSON.stringify({ version: 1, iv: encode(iv), data: encode(new Uint8Array(ciphertext)) }));
  return { user_id: stored.user_id, expires_at: stored.expires_at };
}

export async function readMlTokens(env) {
  ensureReady(env);
  const value = await env.ML_OAUTH_TOKENS.get(KEY_NAME);
  if (!value) return null;
  const record = JSON.parse(value);
  if (record.version !== 1) throw new Error('Formato OAuth almacenado no compatible.');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(record.iv) }, await aesKey(env), decode(record.data));
  const stored = JSON.parse(new TextDecoder().decode(plaintext));
  if (!stored.access_token || !stored.refresh_token) throw new Error('Credenciales OAuth incompletas.');
  return stored;
}

export async function requestMlToken(env, data, fetchImplementation = fetch) {
  ensureReady(env);
  const url = 'https://api.mercadolibre.com/oauth/token';
  const body = new URLSearchParams({
    ...data,
    client_id: String(env.ML_CLIENT_ID),
    client_secret: String(env.ML_CLIENT_SECRET),
  });
  const response = await fetchImplementation(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    // No incluir cuerpos de errores: pueden contener identificadores sensibles.
    throw new Error('Mercado Libre no autorizó el intercambio de credenciales (HTTP ' + response.status + '). Reinicia la autorización o revisa permisos.');
  }
  const payload = await response.json();
  if (!payload || typeof payload.access_token !== 'string' || typeof payload.refresh_token !== 'string') {
    throw new Error('Mercado Libre devolvió una respuesta sin ambos tokens.');
  }
  return payload;
}

export async function exchangeMlCode(env, code, redirect, fetchImplementation = fetch) {
  ensureReady(env);
  if (typeof code !== 'string' || code.length < 8 || code.length > 2048) throw new Error('Código OAuth inválido.');
  if (redirect !== env.ML_OAUTH_REDIRECT_URI) throw new Error('URL de retorno OAuth no coincide.');
  const payload = await requestMlToken(env, { grant_type: 'authorization_code', code, redirect_uri: redirect }, fetchImplementation);
  return saveMlTokens(env, payload);
}

// Renovación disparada por el administrador. No automatizar desde solicitudes concurrentes:
// Mercado Libre invalida el refresh token inmediatamente después de usarlo y KV no ofrece CAS.
export async function refreshMlTokens(env, fetchImplementation = fetch) {
  const old = await readMlTokens(env);
  if (!old) throw new Error('No hay una autorización OAuth guardada.');
  const payload = await requestMlToken(env, { grant_type: 'refresh_token', refresh_token: old.refresh_token }, fetchImplementation);
  return saveMlTokens(env, payload);
}

export async function mlTokenStatus(env, now = Date.now()) {
  if (!oauthStorageReady(env)) return { configured: false, authorized: false };
  const tokens = await readMlTokens(env);
  if (!tokens) return { configured: true, authorized: false };
  return { configured: true, authorized: true, expires_at: tokens.expires_at,
    expired: tokens.expires_at <= now, user_id: tokens.user_id };
}
