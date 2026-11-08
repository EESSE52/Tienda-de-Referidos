import { describe, it, expect } from 'vitest';
import { priceAgeStatus, summarizePriceAges } from '../../public/admin/price-alerts.js';

const now = new Date('2026-11-08T12:00:00Z');
const product = (fecha_precio, extra = {}) => ({
  id: 'MLC123456789', activo: true, es_prueba: false, fecha_precio, ...extra,
});

describe('alertas locales de antigüedad de precios', () => {
  it('marca pendiente solo después de 14 días y mantiene el día 14 dentro de plazo', () => {
    expect(priceAgeStatus(product('2026-10-25'), now).status).toBe('vigente');
    expect(priceAgeStatus(product('2026-10-24'), now).status).toBe('vencido');
    expect(priceAgeStatus(product('2026-11-08'), now).days).toBe(0);
  });
  it('detecta fechas inexistentes, vacías y futuras sin calificarlas como verificadas', () => {
    expect(priceAgeStatus(product(''), now).status).toBe('sin_fecha');
    expect(priceAgeStatus(product('2026-02-30'), now).status).toBe('sin_fecha');
    expect(priceAgeStatus(product('mañana'), now).status).toBe('sin_fecha');
    expect(priceAgeStatus(product('2026-11-09'), now).status).toBe('fecha_futura');
  });
  it('excluye del conteo urgente a productos inactivos o de prueba', () => {
    const rows = [
      product('2026-10-24'), product('2026-10-25'),
      product(null), product('2026-11-09'),
      product('2026-09-01', { activo: false }),
      product('2026-09-01', { es_prueba: true }),
    ];
    expect(summarizePriceAges(rows, now)).toEqual({
      vigente: 1, vencido: 1, sin_fecha: 1, fecha_futura: 1, inactivo: 1, prueba: 1,
    });
  });
  it('no modifica los datos recibidos', () => {
    const original = Object.freeze(product('2026-10-01'));
    priceAgeStatus(original, now);
    expect(original.fecha_precio).toBe('2026-10-01');
  });
});
