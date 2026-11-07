import { describe, expect, it } from 'vitest';
import { currencyCLPUnit, getBestMetricValue, getListaById, loadCatalog } from './catalog';

describe('getBestMetricValue', () => {
  it('devuelve el mejor valor menor para métricas de costo', () => {
    expect(getBestMetricValue('menor', [120, 89, 95, null])).toBe(89);
  });

  it('devuelve el mejor valor mayor para métricas de rendimiento', () => {
    expect(getBestMetricValue('mayor', [120, 89, 95, null])).toBe(120);
  });

  it('devuelve null si no hay valores válidos', () => {
    expect(getBestMetricValue('menor', [null, undefined, null])).toBeNull();
  });
});

describe('modelo de listas migrado', () => {
  it('mantiene listas activas con metricas por plantilla', () => {
    const lista = getListaById('creatina');
    expect(lista?.activa).toBe(true);
    expect(Array.isArray(lista?.metricas)).toBe(true);
    expect(lista?.metricas[0]?.plantilla?.tipo).toBe('precio_dividido_por');
  });
});

describe('loadCatalog', () => {
  it('usa el catálogo local cuando el binding de D1 no existe o es inválido', async () => {
    const catalog = await loadCatalog({} as any);
    expect(catalog.listas.length).toBeGreaterThan(0);
    expect(catalog.getListaById('creatina')?.nombre).toBe('Creatina');
  });

  it('usa el catálogo local cuando la consulta a D1 falla por BD sin inicializar', async () => {
    const catalog = await loadCatalog({
      prepare: () => {
        throw new Error('no such table: catalog_lists');
      },
    } as any);

    expect(catalog.listas.length).toBeGreaterThan(0);
    expect(catalog.getListaById('proteina')?.nombre).toBe('Proteína');
  });
});


describe('moneda CLP para precios unitarios', () => {
  it('muestra centavos reales sin redondear el costo por gramo', () => {
    expect(currencyCLPUnit(34990 / 1000)).toContain('34,99');
    expect(currencyCLPUnit(34990 / 200)).toContain('174,95');
  });
  it('mantiene valores enteros legibles y los valores ausentes sin inventar', () => {
    expect(currencyCLPUnit(175)).toContain('175');
    expect(currencyCLPUnit(null)).toBe('—');
  });
});
