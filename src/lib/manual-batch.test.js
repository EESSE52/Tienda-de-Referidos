import { describe, expect, it } from 'vitest';
import { prepareManualBatch } from './manual-batch.js';

const url = 'https://www.mercadolibre.cl/creatina/up/MLCU3220313328#polycard_client=affiliates&wid=MLC2908577036';
const row = { lista_id: 'creatina', nombre: 'Creatina Gomitas', marca: 'Perfect Bear',
  precio: 18990, enlace_referido: url, id_publicacion: 'MLC2908577036', activo: true };
const catalog = { listas: [{ id: 'creatina', slug: 'creatina', campos: [] }], productos: [] };

describe('guardado directo de lote manual', () => {
  it('prepara productos exclusivamente inactivos sin escribir D1', () => {
    const result = prepareManualBatch([row], catalog);
    expect(result.errors).toEqual([]);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({ activo: false, es_prueba: false,
      id_publicacion: 'MLC2908577036' });
  });
  it('rechaza duplicados ya existentes por ID de publicación', () => {
    const result = prepareManualBatch([row], { ...catalog,
      productos: [{ id: 'old', lista_id: 'creatina', id_publicacion: 'MLC2908577036' }] });
    expect(result.accepted).toHaveLength(0);
    expect(result.errors[0].message).toContain('duplicada');
  });
  it('no guarda parcialmente cuando hay repetidos en el lote', () => {
    const result = prepareManualBatch([row, row], catalog);
    expect(result.accepted).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
  it('rechaza enlace ajeno, o una publicación que no corresponde a la URL', () => {
    expect(prepareManualBatch([{ ...row, enlace_referido: 'https://evil.example/MLC2908577036' }], catalog).accepted).toHaveLength(0);
    expect(prepareManualBatch([{ ...row, id_publicacion: 'MLC1234567890' }], catalog).accepted).toHaveLength(0);
  });
  it('guarda la URL de publicación distinta del enlace corto de afiliado', () => {
    const result = prepareManualBatch([{
      ...row,
      url_publicacion: url,
      enlace_referido: 'https://meli.la/2ATCSzi',
    }], catalog);
    expect(result.errors).toEqual([]);
    expect(result.accepted[0]).toMatchObject({
      activo: false,
      url_publicacion: url,
      enlace_referido: 'https://meli.la/2ATCSzi',
    });
  });
  it('rechaza enlaces afiliados fuera de Mercado Libre Chile en lote manual', () => {
    const result = prepareManualBatch([{
      ...row, url_publicacion: url, enlace_referido: 'https://sitio-falso.example/venta',
    }], catalog);
    expect(result.accepted).toHaveLength(0);
    expect(result.errors[0].message).toContain('afiliado');
  });
  it('rechaza lotes vacíos o mayores de diez', () => {
    expect(() => prepareManualBatch([], catalog)).toThrow();
    expect(() => prepareManualBatch(Array(11).fill(row), catalog)).toThrow();
  });
});
