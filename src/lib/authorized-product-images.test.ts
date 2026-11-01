import { describe, expect, it } from 'vitest';
import { normaliseProductPayload, validateProductPayload } from './admin-validacion.js';
import { getPublicProductImage, isApprovedPublicImageUrl } from './public-site';

const base = {
  lista_id: 'creatina',
  nombre: 'Creatina Gomitas',
  precio: 19990,
  activo: false,
  url_publicacion: 'https://www.mercadolibre.cl/creatina',
  enlace_referido: 'https://meli.la/2ATCSzi',
};

describe('imágenes autorizadas de productos', () => {
  it('exige confirmación antes de guardar una URL pública nueva', () => {
    expect(() => validateProductPayload({ ...base, imagen_propia: 'https://fotos.example/creatina.jpg' }))
      .toThrow('autorización');
    const result = validateProductPayload({
      ...base, imagen_propia: 'https://fotos.example/creatina.jpg', imagen_autorizada_confirmada: true,
    });
    expect(result.imagen_fuente).toBe('autorizada');
    expect(result.imagen_propia).toBe('https://fotos.example/creatina.jpg');
    expect(result.enlace_referido).toBe(base.enlace_referido);
  });
  it('permite editar un producto manteniendo su imagen ya aprobada', () => {
    const existing = validateProductPayload({
      ...base, id: 'gomitas-1', imagen_propia: 'https://fotos.example/gomitas.webp', imagen_autorizada_confirmada: true,
    });
    const result = validateProductPayload({ ...existing, precio: 18990 }, [existing], existing.id);
    expect(result.imagen_propia).toBe(existing.imagen_propia);
  });
  it('rechaza URL de imagen insegura y credenciales en la URL', () => {
    for (const url of ['http://fotos.example/foto.jpg', 'javascript:alert(1)', 'https://user:pass@fotos.example/image.png']) {
      expect(() => validateProductPayload({ ...base, imagen_propia: url, imagen_autorizada_confirmada: true })).toThrow('HTTPS');
      expect(isApprovedPublicImageUrl(url)).toBe(false);
    }
  });
  it('mantiene imágenes candidatas ocultas cuando no existe foto autorizada', () => {
    const product = normaliseProductPayload({
      ...base, imagen_candidata: 'https://mercadolibre.cl/foto.jpg',
    });
    expect(getPublicProductImage(product)).toBe('/img/generica-creatina.svg');
    product.imagen_propia = 'https://fotos.example/gomitas.webp';
    expect(getPublicProductImage(product)).toBe('https://fotos.example/gomitas.webp');
  });
});
