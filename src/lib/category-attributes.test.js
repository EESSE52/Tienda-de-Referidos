import { describe, expect, it } from 'vitest';
import { normalizeCategoryAttributes } from './category-attributes.js';

const category = {
  campos: [
    { clave: 'unidades_total', tipo: 'numero', etiqueta: 'Unidades totales' },
    { clave: 'tipo', tipo: 'seleccion', etiqueta: 'Tipo', opciones: ['Polvo', 'Cápsulas'] },
    { clave: 'sabor', tipo: 'texto', etiqueta: 'Sabor' },
  ],
};

describe('atributos configurables del comparador', () => {
  it('convierte campos numéricos y conserva valores de otros atributos', () => {
    const result = normalizeCategoryAttributes(category, { unidades_total: '60', tipo: 'Polvo' }, { antiguo: 12 });
    expect(result).toEqual({ antiguo: 12, unidades_total: 60, tipo: 'Polvo' });
  });
  it('permite borrar valores opcionales al editar', () => {
    const result = normalizeCategoryAttributes(category, { sabor: '' }, { sabor: 'Vainilla', antiguo: true });
    expect(result).toEqual({ antiguo: true });
  });
  it('rechaza valores numéricos o selecciones inválidas', () => {
    expect(() => normalizeCategoryAttributes(category, { unidades_total: 'abc' })).toThrow('Número inválido');
    expect(() => normalizeCategoryAttributes(category, { tipo: 'Otro' })).toThrow('Opción inválida');
  });
  it('mantiene funcionando categorías sin campos definidos', () => {
    expect(normalizeCategoryAttributes({ id: 'accesorios' }, { extra: 3 })).toEqual({});
  });
});
