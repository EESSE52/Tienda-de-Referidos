import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { classifyBatchReview, summarizeBatchReviews, batchReviewCsv } from '../../public/admin/batch-review-report.js';

describe('Fase 7.8: informe de consultas en lote', () => {
  it('distingue bajadas subidas y precios iguales', () => {
    expect(classifyBatchReview({ precio_actual: 10000, precio_consultado: 9000 })).toBe('baja');
    expect(classifyBatchReview({ precio_actual: 10000, precio_consultado: 12000 })).toBe('subida');
    expect(classifyBatchReview({ precio_actual: 10000, precio_consultado: 10000 })).toBe('sin_cambio');
  });
  it('rechaza valores no verificables', () => {
    expect(() => classifyBatchReview({precio_actual:0,precio_consultado:10})).toThrow();
    expect(() => classifyBatchReview({precio_actual:100,precio_consultado:NaN})).toThrow();
  });
  it('resume consultas fallidas sin contarlas como precios revisados', () => {
    expect(summarizeBatchReviews([
      {estado:'baja'},{estado:'subida'},{estado:'sin_cambio'},{estado:'error'},
    ])).toEqual({ consultados:3, bajas:1, subidas:1, sin_cambio:1, fallidos:1 });
  });
  it('exporta CSV escapado sin inventar disponibilidad', () => {
    const csv=batchReviewCsv([{
      nombre:'Creatina "100"; nuevo', id_publicacion:'MLC123456789',
      precio_actual:10000,precio_consultado:9000,estado:'baja',observacion:'Requiere confirmación',
    }]);
    expect(csv).toContain('Creatina ""100""; nuevo');
    expect(csv).toContain('No verificada');
    expect(csv).toContain('"-1000"');
  });
  it('incluye interfaz de informe y mantiene confirmación por producto', () => {
    const html=readFileSync(new URL('../../public/admin/index.html', import.meta.url),'utf8');
    expect(html).toContain('id="batch-export-btn"');
    expect(html).toContain('id="batch-review-totals"');
    expect(html).toContain('classifyBatchReview(review)');
    expect(html).toContain('batchReport.push(');
    expect(html).toContain("confirmButton.textContent = 'Confirmar solo este precio'");
    expect(html).toContain('Disponibilidad no verificada');
  });
});
