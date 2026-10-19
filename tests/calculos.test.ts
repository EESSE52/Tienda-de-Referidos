import { describe, expect, it } from 'vitest';
import {
  calcularMetricas,
  dividir,
  precioPorDosis,
  precioPorGramo,
  precioPorGramoProteina,
  precioPorPorcion,
} from '../src/lib/calculos';
import { diasDesde, formatoCLP, formatoFecha, precioDesactualizado } from '../src/lib/formato';

describe('cálculos', () => {
  it('precio por porción y por gramo (casos normales)', () => {
    expect(precioPorPorcion(20000, 100)).toBe(200);
    expect(precioPorGramo(20000, 500)).toBe(40);
  });
  it('precio por dosis desde precio por gramo', () => {
    expect(precioPorDosis(20000, 500, 3)).toBe(120);
    expect(precioPorDosis(20000, 500, 5)).toBe(200);
  });
  it('precio por gramo de proteína', () => {
    expect(precioPorGramoProteina(40000, 30, 25)).toBeCloseTo(53.333, 3);
  });
  it('datos faltantes devuelven null', () => {
    expect(precioPorPorcion(undefined, 10)).toBeNull();
    expect(precioPorGramo(1000, null)).toBeNull();
    expect(precioPorDosis(1000, undefined, 3)).toBeNull();
    expect(precioPorGramoProteina(1000, 10, undefined)).toBeNull();
    expect(precioPorGramoProteina(1000, undefined, 20)).toBeNull();
  });
  it('división por cero y valores inválidos devuelven null, nunca NaN/Infinity', () => {
    expect(dividir(100, 0)).toBeNull();
    expect(precioPorPorcion(1000, 0)).toBeNull();
    expect(precioPorGramoProteina(1000, 10, 0)).toBeNull();
    expect(precioPorGramo(NaN, 10)).toBeNull();
    expect(dividir(100, Infinity)).toBeNull();
  });
  it('calcularMetricas con datos incompletos', () => {
    const m = calcularMetricas({ precio: 1000, porciones: 10 });
    expect(m.precio_por_porcion).toBe(100);
    expect(m.precio_por_gramo).toBeNull();
    expect(m.precio_por_gramo_proteina).toBeNull();
  });
});

describe('formato', () => {
  it('CLP con separador de miles y decimales', () => {
    expect(formatoCLP(24990)).toBe('$24.990');
    expect(formatoCLP(1234567)).toBe('$1.234.567');
    expect(formatoCLP(41.666, 1)).toBe('$41,7');
    expect(formatoCLP(null)).toBe('—');
    expect(formatoCLP(NaN)).toBe('—');
  });
  it('fechas', () => {
    expect(formatoFecha('2026-10-05')).toBe('05/10/2026');
    expect(formatoFecha(undefined)).toBe('—');
  });
  it('precio desactualizado a más de 14 días', () => {
    const hoy = new Date('2026-10-20T12:00:00Z');
    expect(diasDesde('2026-10-06', hoy)).toBe(14);
    expect(precioDesactualizado('2026-10-06', hoy)).toBe(false);
    expect(precioDesactualizado('2026-10-05', hoy)).toBe(true);
    expect(precioDesactualizado('basura', hoy)).toBe(true);
  });
});
