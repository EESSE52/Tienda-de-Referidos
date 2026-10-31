import { describe, expect, it } from 'vitest';
import { normaliseProductPayload, validateProductPayload } from './admin-validacion';

describe('normaliseProductPayload', () => {
  it('normaliza nombres, marca y precios en formato chileno', () => {
    const product = normaliseProductPayload({
      lista_id: 'creatina',
      nombre: '  Creatina   Monohidratada  300g  ',
      marca: ' Nutra ',
      precio: '12.500',
      enlace_referido: 'https://example.com/creatina',
      id_publicacion: 'MLC-123',
      vendedor: 'Nutra',
      atributos: { gramos_total: 300 },
    });

    expect(product.nombre).toBe('Creatina Monohidratada 300g');
    expect(product.marca).toBe('Nutra');
    expect(product.precio).toBe(12500);
    expect(product.enlace_referido).toBe('https://example.com/creatina');
  });

  it('mantiene los campos del modelo enriquecido y la compatibilidad de ML', () => {
    const product = normaliseProductPayload({
      lista_id: 'creatina',
      nombre: 'Creatina Monohidratada 300 g',
      marca: 'Nutra',
      enlace_referido: 'https://example.com/creatina',
      precio: '24990',
      id_catalogo: 'MLC-999',
      id_publicacion: 'MLC-123',
      estado_oferta: 'sin_verificar',
      vendedor_nombre: 'Nutra',
      mercadolider: true,
      imagen_propia: 'https://example.com/imagen.jpg',
      atributos: { gramos_total: 300, porciones: 30 },
    });

    expect(product.id_catalogo).toBe('MLC-999');
    expect(product.precio_original).toBeNull();
    expect(product.estado_oferta).toBe('sin_verificar');
    expect(product.vendedor_nombre).toBe('Nutra');
    expect(product.mercadolider).toBe(true);
    expect(product.imagen_propia).toBe('https://example.com/imagen.jpg');
    expect(product.atributos).toMatchObject({ gramos_total: 300, porciones: 30 });
  });
});

describe('validateProductPayload', () => {
  it('rechaza productos duplicados en la misma lista', () => {
    const productos = [{
      id: 'p-1',
      lista_id: 'creatina',
      nombre: 'Creatina Monohidratada 300g',
      enlace_referido: 'https://example.com/creatina',
      url_publicacion: 'https://example.com/creatina',
      precio: 12500,
    }];

    expect(() => validateProductPayload({
      lista_id: 'creatina',
      nombre: 'Creatina Monohidratada 300g',
      enlace_referido: 'https://example.com/creatina',
      precio: '12500',
    }, productos)).toThrow(/duplicado|ya existe/i);
  });
});
