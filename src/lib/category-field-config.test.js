import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('./cloudflare-catalog.js', () => ({ readCatalog: vi.fn(), saveRecord: vi.fn() }));
import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { configureCategoryField } from './admin-categories.js';

const original = {
  id: 'creatina', slug: 'creatina', nombre: 'Creatina',
  campos: [{ clave: 'gramos_total', etiqueta: 'Cantidad total', tipo: 'numero', requerido: true }],
  metricas: [{ clave: 'precio_por_gramo', plantilla: { tipo: 'precio_dividido_por', campo: 'gramos_total' } }],
};
const gummies = {
  id: 'creatina-gomitas', slug: 'creatina-gomitas', nombre: 'Creatina gomitas',
  campos: [
    { clave: 'gramos_total', etiqueta: 'Cantidad total', tipo: 'numero', requerido: true },
    { clave: 'formato', etiqueta: 'Formato', tipo: 'seleccion', requerido: true, opciones: ['Polvo', 'Tabletas'] },
  ],
  metricas: structuredClone(original.metricas),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCatalog).mockResolvedValue({ listas: [original, gummies], productos: [] });
});

describe('configurar campos de categoría', () => {
  it('permite hacer opcionales los gramos solo en la categoría de gomitas', async () => {
    const category = await configureCategoryField({}, 'creatina-gomitas', { clave: 'gramos_total', requerido: false });
    expect(category.campos[0].requerido).toBe(false);
    expect(original.campos[0].requerido).toBe(true);
    expect(category.metricas).toEqual(gummies.metricas);
    expect(saveRecord).toHaveBeenCalledWith({}, 'catalog_lists', category);
  });
  it('permite añadir Gomitas a las opciones de formato', async () => {
    const category = await configureCategoryField({}, 'creatina-gomitas', {
      clave: 'formato', requerido: true, opciones: ['Polvo', 'Tabletas', 'Gomitas'],
    });
    expect(category.campos[1].opciones).toContain('Gomitas');
  });
  it('rechaza opciones repetidas y opción en campo numérico', async () => {
    await expect(configureCategoryField({}, 'creatina-gomitas', { clave: 'formato', opciones: ['Gomitas', 'Gomitas'] })).rejects.toThrow('únicas');
    await expect(configureCategoryField({}, 'creatina-gomitas', { clave: 'gramos_total', opciones: ['Gomitas'] })).rejects.toThrow('selección');
    expect(saveRecord).not.toHaveBeenCalled();
  });
  it('rechaza campos inexistentes y categorías inexistentes', async () => {
    await expect(configureCategoryField({}, 'creatina-gomitas', { clave: 'desconocido' })).rejects.toThrow('Campo no encontrado');
    await expect(configureCategoryField({}, 'no-existe', { clave: 'formato' })).rejects.toThrow('Categoría no encontrada');
  });
});
