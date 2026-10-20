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
