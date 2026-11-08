import { describe, it, expect } from 'vitest';
import { validateAnalyticsEvent, displayAnalytics } from './analytics.js';
const catalog = { productos: [
  { id:'MLC1859621269', nombre:'Foodtech 1kg', lista_id:'creatina', vendedor_nombre:'Foodtech', activo:true },
  { id:'MLC1234567890', nombre:'Proteína 1kg', lista_id:'proteina', vendedor_nombre:'Tienda B', activo:true },
  { id:'DEMO-TEST', nombre:'Demo', lista_id:'creatina', activo:true, es_prueba:true },
] };
describe('Fase 6: analítica agregada sin PII', () => {
  it('valida solamente eventos y ubicaciones conocidas', () => {
    expect(validateAnalyticsEvent({event:'view',product_id:'MLC1859621269',placement:'product'})).toEqual({
      event:'view',productId:'MLC1859621269',placement:'product',
    });
    expect(validateAnalyticsEvent({event:'affiliate_click',product_id:'MLC1859621269',placement:'seller_offer'})).not.toBeNull();
    for (const bad of [
      { event:'sale',product_id:'MLC1859621269',placement:'product' },
      { event:'view',product_id:'MLC1859621269',placement:'category_card' },
      { event:'affiliate_click',product_id:'../../x',placement:'product' },
      { event:'affiliate_click',product_id:'MLC1859621269',placement:'unknown' },
      {},
    ]) expect(validateAnalyticsEvent(bad)).toBeNull();
  });
  it('agrega cantidades por producto, categoría y vendedor sin generar ingresos ficticios', () => {
    const out = displayAnalytics([
      {product_id:'MLC1859621269',event_type:'view',total:10},
      {product_id:'MLC1859621269',event_type:'affiliate_click',total:3},
      {product_id:'MLC1234567890',event_type:'affiliate_click',total:1},
      {product_id:'DEMO-TEST',event_type:'affiliate_click',total:999},
      {product_id:'INEXISTENTE',event_type:'view',total:100},
    ],catalog,7);
    expect(out.totals).toEqual({visitas:10,clics:4});
    expect(out.products).toHaveLength(2);
    expect(out.categories.find(c=>c.categoria==='creatina').clics).toBe(3);
    expect(out.sellers.find(v=>v.vendedor==='Tienda B').clics).toBe(1);
    expect(out.disclaimer).toContain('no usuarios únicos, ventas ni comisiones');
    expect(out).not.toHaveProperty('revenue');
  });
});
