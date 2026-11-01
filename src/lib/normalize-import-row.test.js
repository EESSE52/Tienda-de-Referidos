import { describe, expect, it } from 'vitest';
import { normalizeImportRow } from './normalize-import-row.js';
import { validateImportBatch } from './admin-import.js';

const category = {
  id: 'creatina', slug: 'creatina',
  campos: [
    { clave: 'gramos_total', etiqueta: 'Gramos', tipo: 'numero', requerido: true },
    { clave: 'porciones', etiqueta: 'Porciones', tipo: 'numero' },
    { clave: 'pureza', etiqueta: 'Pureza', tipo: 'numero' },
    { clave: 'formato', etiqueta: 'Formato', tipo: 'seleccion', opciones: ['Polvo', 'Cápsulas'] },
  ],
};
const valid = {
  lista_id: 'creatina',
  nombre: 'Creatina nueva',
  precio: '15.990',
  enlace_referido: 'https://www.mercadolibre.cl/producto',
  gramos_total: '300',
  pureza: '99,9',
  formato: 'Polvo',
};

describe('CSV con campos personalizables', () => {
  it('acepta campos declarados de una categoría, con conversión numérica', () => {
    const product = normalizeImportRow(valid, category);
    expect(product).toMatchObject({
      lista_id: 'creatina', precio: 15990, activo: false,
      atributos: { gramos_total: 300, pureza: 99.9, formato: 'Polvo' },
    });
  });
  it('rechaza magnitudes inválidas y selecciones fuera de las opciones', () => {
    const catalog = { listas: [category], productos: [] };
    const rows = [
      { ...valid, pureza: 'incorrecta' },
      { ...valid, formato: 'Líquido' },
      { ...valid, gramos_total: '' },
    ];
    const result = validateImportBatch(rows, catalog, normalizeImportRow);
    expect(result.accepted).toHaveLength(0);
    expect(result.errors).toHaveLength(3);
  });
  it('importa solamente filas válidas y preserva la identificación de prueba', () => {
    const catalog = { listas: [category], productos: [] };
    const result = validateImportBatch([
      { ...valid, es_prueba: 'sí', id: 'creatina-a' },
      { ...valid, id: 'creatina-b', nombre: 'Otra creatina', enlace_referido: 'https://www.mercadolibre.cl/otra', pureza: 'no' },
    ], catalog, normalizeImportRow);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].es_prueba).toBe(true);
    expect(result.errors).toMatchObject([{ row: 3 }]);
  });
  it('no trata columnas ajenas como atributos de comparación', () => {
    const result = normalizeImportRow({ ...valid, secreto: 'no guardar' }, category);
    expect(result.atributos).not.toHaveProperty('secreto');
  });
});
