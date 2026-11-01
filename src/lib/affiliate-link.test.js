import { describe, expect, it } from 'vitest';
import { validateProductPayload } from './admin-validacion.js';

const base = {
  lista_id: 'creatina',
  nombre: 'Creatina Gomitas 60 unidades',
  precio: 19990,
  activo: false,
  url_publicacion: 'https://www.mercadolibre.cl/creatina/up/MLCU3220313328#wid=MLC2908577036',
  enlace_referido: '',
};

describe('enlace afiliado y publicación separados', () => {
  it('permite producto inactivo pendiente de afiliación', () => {
    const product = validateProductPayload(base);
    expect(product.activo).toBe(false);
    expect(product.enlace_referido).toBe('');
    expect(product.url_publicacion).toContain('MLCU3220313328');
  });
  it('no permite activar producto real sin enlace de afiliado', () => {
    expect(() => validateProductPayload({ ...base, activo: true }))
      .toThrow('enlace de afiliado');
  });
  it('permite activar con enlace de afiliado HTTPS y lo conserva intacto', () => {
    const url = 'https://meli.la/2ATCSzi?utm=test#code=original';
    const product = validateProductPayload({ ...base, activo: true, enlace_referido: url });
    expect(product.enlace_referido).toBe(url);
    expect(product.url_publicacion).toBe(base.url_publicacion);
  });
  it('rechaza enlaces afiliados no HTTPS', () => {
    expect(() => validateProductPayload({ ...base, enlace_referido: 'http://meli.la/2ATCSzi' }))
      .toThrow('HTTPS');
  });
});
