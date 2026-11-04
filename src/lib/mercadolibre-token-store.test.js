import { describe, expect, it, vi } from 'vitest';
import { oauthStorageReady, exchangeMlCode, readMlTokens, refreshMlTokens, mlTokenStatus } from './mercadolibre-token-store.js';

function fixture() {
  const map = new Map();
  const env = {
    ML_OAUTH_TEST_MODE: 'enabled',
    ML_CLIENT_ID: 'client-id-test',
    ML_CLIENT_SECRET: 'secret-only-in-test',
    ML_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
    ML_OAUTH_REDIRECT_URI: 'https://pruebas.example.org/api/admin/mercadolibre/oauth/callback',
    ML_OAUTH_TOKENS: {
      get: async key => map.get(key) ?? null,
      put: async (key, value) => { map.set(key, value); },
    },
  };
  return { env, map };
}

const tokenReply = (access = 'ACCESS-123', refresh = 'REFRESH-123') => ({
  access_token: access, refresh_token: refresh, expires_in: 3600, user_id: 42,
});

describe('almacén cifrado para OAuth aislado', () => {
  it('permanece cerrado sin secreto, KV exclusivo o clave AES', () => {
    const { env } = fixture();
    expect(oauthStorageReady({ ...env, ML_CLIENT_SECRET: '' })).toBe(false);
    expect(oauthStorageReady({ ...env, ML_OAUTH_TOKENS: null })).toBe(false);
    expect(oauthStorageReady({ ...env, ML_TOKEN_ENCRYPTION_KEY: 'muy-corta' })).toBe(false);
  });
  it('intercambia código OAuth sin exponer secretos en el KV y permite consultar estado', async () => {
    const { env, map } = fixture();
    const request = vi.fn(async () => ({ ok: true, json: async () => tokenReply() }));
    const result = await exchangeMlCode(env, 'CODE-12345678', env.ML_OAUTH_REDIRECT_URI, request);
    expect(result.user_id).toBe('42');
    expect(request.mock.calls[0][0]).toBe('https://api.mercadolibre.com/oauth/token');
    expect(request.mock.calls[0][1].body).toContain('grant_type=authorization_code');
    expect(request.mock.calls[0][1].body).toContain('redirect_uri=');
    expect(JSON.stringify([...map.values()])).not.toContain('ACCESS-123');
    expect(JSON.stringify([...map.values()])).not.toContain('REFRESH-123');
    const saved = await readMlTokens(env);
    expect(saved.access_token).toBe('ACCESS-123');
    expect(saved.refresh_token).toBe('REFRESH-123');
    expect((await mlTokenStatus(env)).authorized).toBe(true);
  });
  it('utiliza el refresh token guardado y lo sustituye por el nuevo', async () => {
    const { env } = fixture();
    await exchangeMlCode(env, 'CODE-12345678', env.ML_OAUTH_REDIRECT_URI,
      vi.fn(async () => ({ ok: true, json: async () => tokenReply() })));
    const request = vi.fn(async () => ({ ok: true, json: async () => tokenReply('ACCESS-2', 'REFRESH-2') }));
    await refreshMlTokens(env, request);
    expect(request.mock.calls[0][1].body).toContain('grant_type=refresh_token');
    expect(request.mock.calls[0][1].body).toContain('REFRESH-123');
    expect((await readMlTokens(env)).refresh_token).toBe('REFRESH-2');
  });
  it('no guarda credenciales incompletas ni filtra errores de proveedor', async () => {
    const { env, map } = fixture();
    const request = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ access_token: 'SENSITIVE' }) }));
    await expect(exchangeMlCode(env, 'CODE-12345678', env.ML_OAUTH_REDIRECT_URI, request)).rejects.toThrow('401');
    expect(map.size).toBe(0);
  });
});
