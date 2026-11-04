import { describe, expect, it, vi } from 'vitest';
import { diagnoseMercadoLibreAccess } from './mercadolibre-diagnostic.js';

const response = status => ({ status, ok: status >= 200 && status < 300 });

describe('diagnóstico separado de token y publicaciones ML', () => {
  it('identifica bloqueo 403 de ítem con identidad autorizada', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(403));
    const result = await diagnoseMercadoLibreAccess('TOKEN_PRIVADO', 'MLC1234567890', fetchMock);
    expect(result.identity.status).toBe(200);
    expect(result.item.status).toBe(403);
    expect(result.conclusion).toContain('rechaza esta publicación');
    expect(JSON.stringify(result)).not.toContain('TOKEN_PRIVADO');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.mercadolibre.com/users/me');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.mercadolibre.com/items/MLC1234567890');
  });
  it('usa redirect manual, compatible con Cloudflare Workers, sin reenviar el token', async () => {
    const request = vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(403));
    const result = await diagnoseMercadoLibreAccess('TOKEN_PRIVADO', 'MLC1234567890', request);
    expect(result.identity.status).toBe(200);
    expect(result.item.status).toBe(403);
    for (const call of request.mock.calls) expect(call[1].redirect).toBe('manual');
  });
  it('distingue error del runtime de una respuesta HTTP y no expone credenciales', async () => {
    const request = vi.fn().mockRejectedValue(new TypeError('Unsupported redirect mode: error'));
    const result = await diagnoseMercadoLibreAccess('TOKEN_PRIVADO', 'MLC1234567890', request);
    expect(result.identity.status).toBe(null);
    expect(result.identity.error_type).toBe('TypeError');
    expect(result.conclusion).toContain('antes de recibir HTTP');
    expect(JSON.stringify(result)).not.toContain('TOKEN_PRIVADO');
  });
  it('no sigue redirecciones con token de autorización', async () => {
    const request = vi.fn().mockResolvedValueOnce(response(302));
    const result = await diagnoseMercadoLibreAccess('TOKEN_PRIVADO', '', request);
    expect(result.identity.status).toBe(302);
    expect(result.conclusion).toContain('no se reenviaron');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('distingue token rechazado de bloqueo de publicación', async () => {
    const result = await diagnoseMercadoLibreAccess('TOKEN', 'MLC1234567890',
      vi.fn().mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(403)));
    expect(result.conclusion).toContain('/users/me no fue autorizada');
  });
  it('permite diagnóstico solo de cuenta y valida identificadores', async () => {
    const result = await diagnoseMercadoLibreAccess('TOKEN', '', vi.fn().mockResolvedValue(response(200)));
    expect(result.item).toBe(null);
    expect(result.conclusion).toContain('identidad OAuth');
    await expect(diagnoseMercadoLibreAccess('TOKEN', 'MLC123/../../users', vi.fn())).rejects.toThrow('inválido');
  });
});
