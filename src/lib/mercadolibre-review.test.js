import { describe, expect, it } from 'vitest';
import { normalizeChileMercadoLibreUrl } from './mercadolibre-review.js';

describe('revisión de publicaciones Mercado Libre Chile', () => {
  it('admite artículos chilenos, extrae MLC y elimina rastreadores', () => {
    expect(normalizeChileMercadoLibreUrl('https://articulo.mercadolibre.cl/MLC-1234567890?utm_source=test')).toEqual({
      id: 'MLC1234567890',
      url: 'https://articulo.mercadolibre.cl/MLC-1234567890',
    });
  });
  it('rechaza dominios imitadores, países ajenos y HTTP', () => {
    for (const url of [
      'https://www.mercadolibre.cl.ejemplo.com/MLC1234567890',
      'https://mercadolibre.com.ar/MLC1234567890',
      'http://www.mercadolibre.cl/MLC1234567890',
    ]) expect(() => normalizeChileMercadoLibreUrl(url)).toThrow();
  });
  it('rechaza publicaciones sin ID de Chile y credenciales en URL', () => {
    expect(() => normalizeChileMercadoLibreUrl('https://www.mercadolibre.cl/MLA1234567890')).toThrow();
    expect(() => normalizeChileMercadoLibreUrl('https://usuario:clave@www.mercadolibre.cl/MLC1234567890')).toThrow();
  });
});
