import { describe, expect, it } from 'vitest';
import { validateImportBatch } from './admin-import.js';

const catalog = {
  listas: [{ id: 'creatina', slug: 'creatina' }],
  productos: [{
    id: 'registrado',
    lista_id: 'creatina',
    nombre: 'Existente',
    enlace_referido: 'https://example.com/existente',
    precio: 10000,
  }],
};
const normalize = (row) => row;
const valid = (overrides = {}) => ({
  id: 'nuevo',
  lista_id: 'creatina',
  nombre: 'Creatina nueva',
  precio: 15990,
  enlace_referido: 'https://example.com/nueva',
  ...overrides,
});

describe('validación de importación CSV', () => {
  it('acepta un registro válido', () => {
    const result = validateImportBatch([valid()], catalog, normalize);
    expect(result.accepted).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('rechaza productos duplicados dentro del mismo archivo', () => {
    const result = validateImportBatch([valid(), valid({ id: 'nuevo-2' })], catalog, normalize);
    expect(result.accepted).toHaveLength(1);
    expect(result.errors).toMatchObject([{ row: 3 }]);
  });

  it('rechaza identificadores ya existentes', () => {
    const result = validateImportBatch([valid({ id: 'registrado' })], catalog, normalize);
    expect(result.accepted).toHaveLength(0);
    expect(result.errors[0].message).toMatch(/identificador/);
  });

  it('rechaza categorías no registradas y filas inválidas', () => {
    const result = validateImportBatch([valid({ lista_id: 'otra' }), null], catalog, normalize);
    expect(result.accepted).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });

  it('rechaza precios inválidos y permite continuar con otras filas', () => {
    const result = validateImportBatch([
      valid({ precio: 0 }),
      valid({ id: 'otro', nombre: 'Producto válido', enlace_referido: 'https://example.com/otro' }),
    ], catalog, normalize);
    expect(result.accepted).toHaveLength(1);
    expect(result.errors).toMatchObject([{ row: 2 }]);
  });
});
