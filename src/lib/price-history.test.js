import { describe, expect, it } from 'vitest';
import { summarizePriceHistory } from './price-history.js';

describe('historial administrativo de precios', () => {
  it('ordena las fechas y calcula mínimo y máximo sin cambiar los datos originales', () => {
    const input = {
      historial_precios: [
        { fecha: '2026-10-30', precio: 19990 },
        { fecha: '2026-10-28', precio: 15990 },
        { fecha: '2026-10-31', precio: 18990 },
      ],
    };
    const original = JSON.stringify(input);
    const result = summarizePriceHistory(input);
    expect(result.history.map((entry) => entry.fecha)).toEqual(['2026-10-28', '2026-10-30', '2026-10-31']);
    expect(result.lowest).toBe(15990);
    expect(result.highest).toBe(19990);
    expect(result.count).toBe(3);
    expect(JSON.stringify(input)).toBe(original);
  });
  it('admite productos sin historial', () => {
    expect(summarizePriceHistory({})).toMatchObject({ history: [], lowest: null, highest: null, count: 0 });
  });
  it('ignora registros incompletos y precios no positivos', () => {
    const result = summarizePriceHistory({
      historial_precios: [
        { fecha: '2026-11-01', precio: 0 },
        { fecha: 'no-fecha', precio: 1000 },
        { fecha: '2026-11-01', precio: 15990 },
        null,
      ],
    });
    expect(result).toMatchObject({ count: 1, lowest: 15990, highest: 15990 });
  });
});
