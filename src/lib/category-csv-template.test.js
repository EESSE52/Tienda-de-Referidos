import { describe, expect, it } from 'vitest';
import { categoryCsvColumns, generateCategoryCsvTemplate } from './category-csv-template.js';

describe('plantilla CSV de categoría', () => {
  const category = {
    id: 'creatina', slug: 'creatina',
    campos: [
      { clave: 'gramos_total', tipo: 'numero' },
      { clave: 'pureza', tipo: 'numero' },
      { clave: 'formato', tipo: 'seleccion' },
      { clave: 'precio' },
      { clave: 'pureza' },
      { clave: 'no permitido' },
    ],
  };
  it('incluye campos personalizados una sola vez y no duplica columnas generales', () => {
    const columns = categoryCsvColumns(category);
    expect(columns).toContain('gramos_total');
    expect(columns).toContain('pureza');
    expect(columns).toContain('formato');
    expect(columns.filter(item => item === 'precio')).toHaveLength(1);
    expect(columns.filter(item => item === 'pureza')).toHaveLength(1);
    expect(columns).not.toContain('no permitido');
  });
  it('genera CSV con BOM para Excel sin productos ficticios', () => {
    const csv = generateCategoryCsvTemplate(category);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"lista_id","nombre","marca","precio"');
    expect(csv).toContain('"gramos_total","pureza","formato"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
  it('acepta una categoría sin campos propios', () => {
    const columns = categoryCsvColumns({ id: 'accesorios', campos: [] });
    expect(columns).toContain('es_prueba');
    expect(columns).toContain('url_publicacion');
    expect(columns).toHaveLength(10);
  });
  it('rechaza una categoría inválida', () => {
    expect(() => generateCategoryCsvTemplate({ id: '../otra' })).toThrow('Categoría');
  });
});
