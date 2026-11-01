import { describe, expect, it } from 'vitest';
import { evaluateFormula, evaluateMetric, parseNumber, resolveMetricTemplate } from './metricas';

describe('parseNumber', () => {
  it('normaliza precios chilenos con separadores', () => {
    expect(parseNumber('12.500')).toBe(12500);
    expect(parseNumber('12.500,4')).toBe(12500.4);
    expect(parseNumber('12500')).toBe(12500);
    expect(parseNumber('7,5')).toBe(7.5);
  });
});

describe('evaluateFormula', () => {
  it('calcula una métrica normal', () => {
    const product = {
      precio: 35000,
      atributos: {
        porciones: 30,
        gramos_total: 300,
        dosis_3g: 100,
        dosis_5g: 60,
      },
    };

    expect(evaluateFormula({ tipo: 'precio_dividido_por', campo: 'porciones' }, product)).toBeCloseTo(1166.67, 2);
    expect(evaluateFormula({ tipo: 'precio_dividido_por', campo: 'gramos_total' }, product)).toBeCloseTo(116.67, 2);
    expect(evaluateFormula({ tipo: 'campo_dividido_por', campo_a: 'porciones', campo_b: 'gramos_total' }, product)).toBeCloseTo(0.1, 2);
  });

  it('devuelve null si faltan datos', () => {
    const product = {
      precio: 35000,
      atributos: {
        porciones: undefined,
      },
    };

    expect(evaluateFormula({ tipo: 'precio_dividido_por', campo: 'porciones' }, product)).toBeNull();
  });

  it('no calcula costo unitario con precio o cantidad negativa', () => {
    const formula = { tipo: 'precio_dividido_por' as const, campo: 'cantidad_unidades' };
    expect(evaluateFormula(formula, { precio: 19990, atributos: { cantidad_unidades: 60 } })).toBeCloseTo(19990 / 60);
    expect(evaluateFormula(formula, { precio: 19990, atributos: { cantidad_unidades: -60 } })).toBeNull();
    expect(evaluateFormula(formula, { precio: -19990, atributos: { cantidad_unidades: 60 } })).toBeNull();
    expect(evaluateFormula(formula, { precio: 19990, atributos: {} })).toBeNull();
  });

  it('devuelve null si el divisor es cero', () => {
    const product = {
      precio: 35000,
      atributos: {
        porciones: 0,
      },
    };

    expect(evaluateFormula({ tipo: 'precio_dividido_por', campo: 'porciones' }, product)).toBeNull();
  });
});

describe('evaluateMetric', () => {
  it('evalua una metrica del esquema del producto con plantilla', () => {
    const product = {
      precio: 27000,
      atributos: {
        gramos_total: 300,
        porciones: 30,
      },
    };

    const metric = {
      clave: 'precio_por_gramo',
      etiqueta: 'Precio por gramo',
      plantilla: { tipo: 'precio_dividido_por', campo: 'gramos_total' },
      mejor: 'menor',
      decimales: 2,
    };

    expect(evaluateMetric(metric, product)).toBeCloseTo(90, 2);
  });

  it('mantiene compatibilidad con formula legado', () => {
    const product = {
      precio: 32000,
      atributos: {
        porciones: 40,
      },
    };

    const metric = {
      clave: 'precio_por_porcion',
      etiqueta: 'Precio por porcion',
      formula: { tipo: 'precio_dividido_por', campo: 'porciones' },
      mejor: 'menor',
      decimales: 2,
    };

    expect(evaluateMetric(metric, product)).toBeCloseTo(800, 2);
  });

  it('devuelve null cuando la plantilla es invalida', () => {
    const product = { precio: 1000, atributos: { porciones: 10 } };
    const metric = {
      clave: 'invalida',
      etiqueta: 'Invalida',
      plantilla: { tipo: 'precio_dividido_por' } as unknown as { tipo: 'precio_dividido_por'; campo: string },
      mejor: 'menor',
      decimales: 2,
    };

    expect(resolveMetricTemplate(metric)).toBeNull();
    expect(evaluateMetric(metric, product)).toBeNull();
  });
});
