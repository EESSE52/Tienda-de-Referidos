import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { reviewCatalogProducts } from '../../public/admin/catalog-review.js';

const now = new Date('2026-11-08T12:00:00Z');
const product = (id, extra = {}) => ({
  id, nombre: id, lista_id: 'creatina', activo:true, es_prueba:false,
  precio: 12000, fecha_precio:'2026-11-02', enlace_referido:'https://meli.la/123',
  id_publicacion:'MLC123456789', vendedor_nombre:'Tienda',
  ...extra,
});

describe('Fase 7.7: prioridades de revisión del catálogo', () => {
  it('no marca como problema un producto activo con campos y fecha dentro de plazo', () => {
    expect(reviewCatalogProducts([product('A')], now)).toEqual([]);
  });
  it('detecta precios antiguos, enlaces faltantes y publicaciones sin identificar', () => {
    const result = reviewCatalogProducts([
      product('A', { fecha_precio:'2026-10-01', enlace_referido:'', id_publicacion:'' }),
    ], now);
    expect(result[0].problems.map(p=>p.code)).toEqual(['precio','afiliado','publicacion']);
  });
  it('excluye productos inactivos y ficticios y prioriza los más incompletos', () => {
    const result = reviewCatalogProducts([
      product('OK'),
      product('B', {enlace_referido:''}),
      product('C', {precio:0,fecha_precio:'',enlace_referido:''}),
      product('D', {activo:false,precio:0}),
      product('E', {es_prueba:true,precio:0}),
    ], now);
    expect(result.map(x=>x.id)).toEqual(['C','B']);
  });
  it('presenta un panel enlazado y permite revisar sin actualizar precios automáticamente', () => {
    const admin=readFileSync(new URL('../../public/admin/index.html',import.meta.url),'utf8');
    expect(admin).toContain('href="#catalog-review-panel" data-admin-nav>Revisión del catálogo');
    expect(admin).toContain('id="catalog-review-panel"');
    expect(admin).toContain('reviewCatalogProducts(currentProducts)');
    expect(admin).toContain('function renderCatalogReview()');
    expect(admin).toContain("button.textContent = 'Editar producto'");
    expect(admin).toContain('renderCatalogReview();');
  });
});
