import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cloudflare-catalog.js', () => ({
  readCatalog: vi.fn(),
  saveRecord: vi.fn(),
}));

import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { createAdminCategory, updateAdminCategory, addCategoryMetric } from './admin-categories.js';

const existing = {
  id: 'creatina', slug: 'creatina', nombre: 'Creatina',
  descripcion: 'Comparación', activa: true,
  campos: [{ clave: 'gramos_total', etiqueta: 'Gramos' }],
  metricas: [{ clave: 'precio_por_gramo', formula: { tipo: 'precio_dividido_por', campo: 'gramos_total' } }],
  mapa_atributos_ml: { NET_WEIGHT: { campo: 'gramos_total', conversion: 'peso_a_gramos' } },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCatalog).mockResolvedValue({ listas: [{ ...existing }], productos: [] });
  vi.mocked(saveRecord).mockResolvedValue(undefined);
});

describe('administración de categorías D1', () => {
  it('crea una categoría nueva sin fórmulas automáticas inventadas', async () => {
    const category = await createAdminCategory({}, { slug: 'accesorios', nombre: 'Accesorios deportivos' });
    expect(category.id).toBe('accesorios');
    expect(category.campos).toEqual([]);
    expect(category.metricas).toEqual([]);
    expect(saveRecord).toHaveBeenCalledWith({}, 'catalog_lists', expect.objectContaining({ slug: 'accesorios' }));
  });

  it('clona métricas y campos de una plantilla sin modificar la categoría original', async () => {
    const created = await createAdminCategory({}, {
      slug: 'suplementos-nuevos',
      nombre: 'Suplementos nuevos',
      plantilla_id: 'creatina',
    });
    expect(created.campos).toEqual(existing.campos);
    expect(created.metricas).toEqual(existing.metricas);
    expect(created.mapa_atributos_ml).toEqual(existing.mapa_atributos_ml);
    expect(created.campos).not.toBe(existing.campos);
    expect(created.metricas).not.toBe(existing.metricas);
    created.campos[0].etiqueta = 'Cambiado';
    expect(existing.campos[0].etiqueta).toBe('Gramos');
  });

  it('rechaza una plantilla inexistente y no escribe datos', async () => {
    await expect(createAdminCategory({}, {
      slug: 'nueva',
      nombre: 'Nueva categoría',
      plantilla_id: 'no-existe',
    })).rejects.toThrow('plantilla');
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('añade un campo y fórmula precio dividido por ese campo', async () => {
    const category = await addCategoryMetric({}, 'creatina', { clave: 'unidades_total', etiqueta: 'Unidades totales', unidad: 'ud' });
    expect(category.campos).toHaveLength(2);
    expect(category.metricas).toHaveLength(2);
    expect(category.metricas[1].formula).toEqual({ tipo: 'precio_dividido_por', campo: 'unidades_total' });
    expect(existing.campos).toHaveLength(1);
    expect(existing.metricas).toHaveLength(1);
  });

  it('rechaza campos duplicados o inválidos', async () => {
    await expect(addCategoryMetric({}, 'creatina', { clave: 'gramos_total', etiqueta: 'Gramos' })).rejects.toMatchObject({ status: 409 });
    await expect(addCategoryMetric({}, 'creatina', { clave: 'MAL', etiqueta: 'Mal' })).rejects.toThrow('clave');
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('rechaza agregar un campo a una categoría inexistente', async () => {
    await expect(addCategoryMetric({}, 'otra', { clave: 'unidades', etiqueta: 'Unidades' })).rejects.toMatchObject({ status: 404 });
  });

  it('rechaza slug existente', async () => {
    await expect(createAdminCategory({}, { slug: 'creatina', nombre: 'Otra creatina' })).rejects.toMatchObject({ status: 409 });
  });

  it('valida nombre y slug', async () => {
    await expect(createAdminCategory({}, { slug: 'Nombre con Espacios', nombre: 'Categoría' })).rejects.toThrow('slug');
    await expect(createAdminCategory({}, { slug: 'nueva', nombre: 'X' })).rejects.toThrow('nombre');
  });

  it('edita nombre y descripción sin perder configuración y fórmulas', async () => {
    const result = await updateAdminCategory({}, 'creatina', { nombre: 'Creatina deportiva', descripcion: 'Actualizado' });
    expect(result.nombre).toBe('Creatina deportiva');
    expect(result.campos).toEqual(existing.campos);
    expect(result.metricas).toEqual(existing.metricas);
    expect(result.mapa_atributos_ml).toEqual(existing.mapa_atributos_ml);
  });

  it('impide alterar identificadores y reporta categorías inexistentes', async () => {
    await expect(updateAdminCategory({}, 'creatina', { slug: 'otro' })).rejects.toThrow('slug');
    await expect(updateAdminCategory({}, 'inexistente', { nombre: 'Otra' })).rejects.toMatchObject({ status: 404 });
  });
});
