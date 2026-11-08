import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { selectPopularProducts } from './popular-products.js';

const catalog = {
  listas: [{ id: 'creatina', activa: true }, { id: 'oculta', activa: false }],
  productos: [
    { id: 'A', lista_id: 'creatina', nombre: 'Real A', activo: true },
    { id: 'B', lista_id: 'creatina', nombre: 'Real B', activo: true },
    { id: 'C', lista_id: 'creatina', nombre: 'Prueba', activo: true, es_prueba: true },
    { id: 'D', lista_id: 'creatina', nombre: 'Inactivo', activo: false },
    { id: 'E', lista_id: 'oculta', nombre: 'Lista oculta', activo: true },
  ],
};
describe('Fase 7.2: productos populares', () => {
  it('ordena por visitas reales, nunca clics o ventas', () => {
    const result = selectPopularProducts([
      { product_id: 'A', visitas: 3 }, { product_id: 'B', visitas: 9 },
      { product_id: 'A', visitas: 2 },
    ], catalog);
    expect(result.map(({ producto, visitas }) => [producto.id, visitas]))
      .toEqual([['B',9],['A',5]]);
  });
  it('excluye productos de prueba, inactivos, categorías ocultas y conteos inválidos', () => {
    const rows = ['C','D','E','MISSING'].map(product_id => ({ product_id, visitas: 999 }));
    rows.push({product_id: 'A',visitas: -2}, {product_id: 'B',visitas: 0}, {product_id:'A',visitas: 1});
    expect(selectPopularProducts(rows, catalog).map(({producto}) => producto.id)).toEqual(['A']);
  });
  it('no inventa populares cuando no hay actividad y respeta límite', () => {
    expect(selectPopularProducts([],catalog)).toEqual([]);
    expect(selectPopularProducts([{product_id:'A',visitas:1},{product_id:'B',visitas:2}],catalog,1)).toHaveLength(1);
  });
  it('la portada consulta solo vistas agregadas y conserva el enlace a la ficha', () => {
    const homepage = readFileSync(new URL('../pages/index.astro', import.meta.url),'utf8');
    expect(homepage).toContain("event_type = 'view'");
    expect(homepage).toContain('selectPopularProducts');
    expect(homepage).toContain('productosPopulares.length > 0');
    expect(homepage).toContain('encodeURIComponent(producto.id)');
    expect(homepage).toContain('getPublicProductImage(producto)');
  });
});
