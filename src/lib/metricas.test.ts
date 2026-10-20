import { describe, expect, it } from 'vitest';
import { evaluateFormula, evaluateMetric, parseNumber } from './metricas';

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
  it('evalúa una métrica del esquema del producto', () => {
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
      formula: { tipo: 'precio_dividido_por', campo: 'gramos_total' },
      mejor: 'menor',
      decimales: 2,
    };

    expect(evaluateMetric(metric, product)).toBeCloseTo(90, 2);
  });
});
