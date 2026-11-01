import { describe, it, expect, vi } from 'vitest';
import { resolveChileMercadoLibreUrl } from './mercadolibre-review.js';

const redirect = location => ({
  status: 302,
  headers: { get: key => key.toLowerCase() === 'location' ? location : null },
});

describe('enlaces cortos oficiales meli.la', () => {
  it('resuelve una URL corta a publicación chilena y extrae su ID', async () => {
    const request = vi.fn().mockResolvedValue(redirect('https://articulo.mercadolibre.cl/MLC-1234567890?tracking=abc'));
    const result = await resolveChileMercadoLibreUrl('https://meli.la/1f9dPm8', request);
    expect(result).toEqual({
      url: 'https://articulo.mercadolibre.cl/MLC-1234567890',
      id: 'MLC1234567890',
      kind: 'item',
    });
    expect(request).toHaveBeenCalledWith('https://meli.la/1f9dPm8', expect.objectContaining({ redirect: 'manual' }));
  });
  it('reconoce enlace corto que abre una ficha de catálogo /p/', async () => {
    const request = vi.fn().mockResolvedValue(redirect('https://www.mercadolibre.cl/creatina-ejemplo/p/MLC987654321'));
    const result = await resolveChileMercadoLibreUrl('https://meli.la/2ATCSzi', request);
    expect(result).toEqual({
      url: 'https://www.mercadolibre.cl/creatina-ejemplo/p/MLC987654321',
      id: 'MLC987654321',
      kind: 'catalog',
    });
  });
  it('reconoce IDs de publicaciones suministrados en parámetros oficiales', async () => {
    const request = vi.fn().mockResolvedValue(redirect('https://www.mercadolibre.cl/producto?item_id=MLC1234567890'));
    const value = await resolveChileMercadoLibreUrl('https://meli.la/17HcPoF', request);
    expect(value).toMatchObject({ id: 'MLC1234567890', kind: 'item' });
  });
  it('admite una segunda redirección dentro de la lista permitida', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(redirect('https://meli.la/2eHBfim'))
      .mockResolvedValueOnce(redirect('https://www.mercadolibre.cl/creatina/MLC1234567890'));
    const value = await resolveChileMercadoLibreUrl('https://meli.la/1f9dPm8', request);
    expect(value.id).toBe('MLC1234567890');
  });
  it('bloquea redirecciones a sitios ajenos, incluyendo imitadores', async () => {
    for (const target of [
      'https://evil.example/MLC1234567890',
      'http://articulo.mercadolibre.cl/MLC1234567890',
      'https://www.mercadolibre.cl.evil.example/MLC1234567890',
    ]) {
      await expect(resolveChileMercadoLibreUrl('https://meli.la/1f9dPm8', vi.fn().mockResolvedValue(redirect(target))))
        .rejects.toThrow('fuera');
    }
  });
  it('identifica URL final sin MLC para diagnóstico', async () => {
    const request = vi.fn().mockResolvedValue(redirect('https://www.mercadolibre.cl/creatina-sin-id'));
    await expect(resolveChileMercadoLibreUrl('https://meli.la/1Lm2tz7', request))
      .rejects.toThrow('https://www.mercadolibre.cl/creatina-sin-id');
  });
  it('distingue User Product de publicación individual', async () => {
    const request = vi.fn().mockResolvedValue(redirect('https://www.mercadolibre.cl/creatina/up/MLCU123456789'));
    await expect(resolveChileMercadoLibreUrl('https://meli.la/1Lm2tz7', request))
      .rejects.toThrow('User Product');
  });
  it('explica si el enlace no ofrece redirección', async () => {
    await expect(resolveChileMercadoLibreUrl('https://meli.la/1f9dPm8',
      vi.fn().mockResolvedValue({ status: 200, headers: { get: () => null } }))).rejects.toThrow('URL completa');
  });
  it('no acepta URLs de acortadores falsos ni enlaces meli.la no seguros', async () => {
    await expect(resolveChileMercadoLibreUrl('https://meli.la.evil.com/1f9dPm8')).rejects.toThrow('Solo');
    await expect(resolveChileMercadoLibreUrl('http://meli.la/1f9dPm8')).rejects.toThrow('HTTPS');
    await expect(resolveChileMercadoLibreUrl('https://meli.la/%2Fadmin')).rejects.toThrow('formato');
  });
});
