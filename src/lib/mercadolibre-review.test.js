import { describe, expect, it } from 'vitest';
import { normalizeChileMercadoLibreUrl } from './mercadolibre-review.js';

describe('revisión de publicaciones Mercado Libre Chile', () => {
  it('admite artículos chilenos, extrae MLC y elimina rastreadores', () => {
    expect(normalizeChileMercadoLibreUrl('https://articulo.mercadolibre.cl/MLC-1234567890?utm_source=test')).toEqual({
      id: 'MLC1234567890',
      kind: 'item',
      url: 'https://articulo.mercadolibre.cl/MLC-1234567890',
    });
  });
  it('extrae la publicación wid de una ficha MLCU y conserva el enlace de origen', () => {
    const url = 'https://www.mercadolibre.cl/creatina-gomitas-x-60-und-perfect-bear/up/MLCU3220313328?pdp_filters=deal%3AMLC1422857-1&extra_comm=false&brand_comm=false#polycard_client=affiliates&wid=MLC2908577036&sid=affiliates';
    expect(normalizeChileMercadoLibreUrl(url)).toEqual({
      id: 'MLC2908577036', kind: 'item', url,
    });
  });
  it('prioriza la oferta wid de una ficha /p/ y conserva los dos IDs', () => {
    const url = 'https://www.mercadolibre.cl/auriculares-redmi-buds-6-play-inalambricos-xiaomi-negro/p/MLC39962085?pdp_filters=deal%3AMLC1422857-1&extra_comm=false&brand_comm=false#polycard_client=affiliates&wid=MLC2794500346&sid=affiliates';
    expect(normalizeChileMercadoLibreUrl(url)).toEqual({
      id: 'MLC2794500346', catalogId: 'MLC39962085', kind: 'item', url,
    });
  });
  it('identifica Kiffer Labs con ID de catálogo y oferta individual, sin cambiar enlace de origen', () => {
    const url = 'https://www.mercadolibre.cl/creatina-monohidratada-creapure-kiffer-labs-x-series-en-polvo-de-400g/p/MLC53674200?pdp_filters=item_id%3AMLC3027701274&matt_tracing_id=19983c39-dc9b-41ef-ae3d-7a67fc7867e9#polycard_client=social-profile-middleend&source=lists&type=product&wid=MLC3027701274&sid=storefronts';
    expect(normalizeChileMercadoLibreUrl(url)).toEqual({
      id: 'MLC3027701274',
      catalogId: 'MLC53674200',
      kind: 'item',
      url,
    });
  });
  it('conserva la ruta de catálogo cuando no se incluye una oferta wid válida', () => {
    expect(normalizeChileMercadoLibreUrl('https://www.mercadolibre.cl/producto/p/MLC39962085')).toEqual({
      id: 'MLC39962085', kind: 'catalog',
      url: 'https://www.mercadolibre.cl/producto/p/MLC39962085',
    });
    expect(normalizeChileMercadoLibreUrl('https://www.mercadolibre.cl/producto/p/MLC39962085#wid=MLA123456789')).toMatchObject({
      id: 'MLC39962085', kind: 'catalog',
    });
  });
  it('no toma MLCU por identificador de publicación cuando falta wid', () => {
    expect(() => normalizeChileMercadoLibreUrl('https://www.mercadolibre.cl/creatina/up/MLCU3220313328'))
      .toThrow('wid');
  });
  it('rechaza wid ajeno a MLC o manipulado', () => {
    expect(() => normalizeChileMercadoLibreUrl('https://www.mercadolibre.cl/creatina/up/MLCU3220313328#wid=MLA123456789'))
      .toThrow('wid');
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
