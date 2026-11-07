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

describe('publicaciones de múltiples vendedores', () => {
  const base = {
    lista_id: 'creatina', nombre: 'Creatina Foodtech 1 kg', marca: 'Foodtech',
    grupo_ofertas: 'foodtech-1kg-sin-sabor', precio: 34990,
    id_publicacion: 'MLC1859621269', enlace_referido: 'https://meli.la/22bG2Z5',
  };
  const registered = [{ ...base, id: 'MLC1859621269' }];
  it('permite mismo artículo a otro vendedor con publicación y enlace distintos', () => {
    const another = validateProductPayload({
      ...base, id: 'MLC2222222222', id_publicacion: 'MLC2222222222',
      enlace_referido: 'https://meli.la/otra-oferta', vendedor_nombre: 'Otro vendedor',
    }, registered);
    expect(another.grupo_ofertas).toBe(base.grupo_ofertas);
    expect(another.id_publicacion).toBe('MLC2222222222');
  });
  it('rechaza dos ofertas con el mismo ID de publicación, incluso si cambia el enlace', () => {
    expect(() => validateProductPayload({
      ...base, id: 'otro-id', enlace_referido: 'https://meli.la/otro-enlace',
    }, registered)).toThrow(/duplicado/i);
  });
  it('rechaza dos ofertas con el mismo enlace de referido', () => {
    expect(() => validateProductPayload({
      ...base, id: 'MLC2222222222', id_publicacion: 'MLC2222222222',
    }, registered)).toThrow(/duplicado/i);
  });
  it('no permite duplicar el nombre sin una agrupación explícita', () => {
    expect(() => validateProductPayload({
      ...base, id: 'MLC2222222222', id_publicacion: 'MLC2222222222',
      grupo_ofertas: '', enlace_referido: 'https://meli.la/otra-oferta',
    }, registered)).toThrow(/duplicado/i);
  });
  it('valida grupos de ofertas no ambiguos', () => {
    expect(() => validateProductPayload({
      ...base, grupo_ofertas: 'creatina con espacios',
    }, [])).toThrow(/grupo de ofertas/i);
  });
});
