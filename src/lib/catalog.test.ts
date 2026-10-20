import { describe, expect, it } from 'vitest';
import { getBestMetricValue } from './catalog';

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
