import { describe, it, expect } from 'vitest';
import {
  ML_OAUTH_CALLBACK_PATH, createMlOauthStart, checkMlOauthCallback, oauthTestSettings,
} from './mercadolibre-oauth-test.js';

const origin = 'https://pruebas.example.org';
const env = {
  ML_OAUTH_TEST_MODE: 'enabled',
  ML_CLIENT_ID: '123456789',
  ML_OAUTH_REDIRECT_URI: origin + ML_OAUTH_CALLBACK_PATH,
};
const random = new Uint8Array(32).fill(7);

describe('OAuth de pruebas Mercado Libre', () => {
  it('está deshabilitado cuando falta configuración explícita', () => {
    expect(oauthTestSettings({}, origin + '/admin').ready).toBe(false);
  });
  it('no permite usar el dominio de producción', () => {
    expect(oauthTestSettings({ ...env, ML_OAUTH_REDIRECT_URI: 'https://dmonkeysport.com' + ML_OAUTH_CALLBACK_PATH },
      'https://dmonkeysport.com/admin').ready).toBe(false);
  });
  it('exige mismo dominio HTTPS y ruta de retorno exacta', () => {
    expect(oauthTestSettings({ ...env, ML_OAUTH_REDIRECT_URI: 'https://otro.example.org' + ML_OAUTH_CALLBACK_PATH },
      origin + '/admin').ready).toBe(false);
    expect(oauthTestSettings({ ...env, ML_OAUTH_REDIRECT_URI: origin + '/callback' }, origin + '/admin').ready).toBe(false);
    expect(oauthTestSettings(env, 'http://pruebas.example.org/admin').ready).toBe(false);
  });
  it('genera URL de autorización chilena, state y cookie protegida', () => {
    const result = createMlOauthStart(env, origin + '/admin', random);
    expect(result.ready).toBe(true);
    const url = new URL(result.authorizationUrl);
    expect(url.origin).toBe('https://auth.mercadolibre.cl');
    expect(url.searchParams.get('redirect_uri')).toBe(env.ML_OAUTH_REDIRECT_URI);
    expect(url.searchParams.get('state')).toMatch(/^[a-f0-9]{64}$/);
    expect(result.stateCookie).toContain('Secure; HttpOnly; SameSite=Lax');
    expect(result.stateCookie).toContain('Max-Age=600');
  });
  it('acepta retorno con state correcto, sin emitir token', () => {
    const started = createMlOauthStart(env, origin + '/admin', random);
    const state = new URL(started.authorizationUrl).searchParams.get('state');
    const callback = origin + ML_OAUTH_CALLBACK_PATH + '?code=CODIGO_PRUEBA_1234&state=' + state;
    const result = checkMlOauthCallback(env, callback, started.stateCookie);
    expect(result.ok).toBe(true);
    expect(result.message).not.toContain('CODIGO_PRUEBA_1234');
    expect(result.message).toContain('no intercambia ni almacena tokens');
  });
  it('rechaza ausencia de cookie, estado incorrecto o error de proveedor', () => {
    const started = createMlOauthStart(env, origin + '/admin', random);
    const state = new URL(started.authorizationUrl).searchParams.get('state');
    const url = origin + ML_OAUTH_CALLBACK_PATH + '?code=CODIGO_PRUEBA_1234&state=' + state;
    expect(checkMlOauthCallback(env, url, '').ok).toBe(false);
    expect(checkMlOauthCallback(env, url + 'bad', started.stateCookie).ok).toBe(false);
    expect(checkMlOauthCallback(env, url + '&error=access_denied', started.stateCookie).ok).toBe(false);
  });
});
