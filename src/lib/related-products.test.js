import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { selectRelatedProducts } from './related-products.js';

const products = [
  {id:'A',nombre:'A',lista_id:'creatina',activo:true,precio:9000,grupo_ofertas:'same'},
  {id:'A2',nombre:'A2',lista_id:'creatina',activo:true,precio:8000,grupo_ofertas:'same'},
  {id:'B',nombre:'B',lista_id:'creatina',activo:true,precio:12000,grupo_ofertas:'other'},
  {id:'B2',nombre:'B2',lista_id:'creatina',activo:true,precio:11000,grupo_ofertas:'other'},
  {id:'C',nombre:'C',lista_id:'creatina',activo:true,precio:10000},
  {id:'TEST',nombre:'TEST',lista_id:'creatina',activo:true,es_prueba:true},
  {id:'OFF',nombre:'OFF',lista_id:'creatina',activo:false},
  {id:'OTHER',nombre:'OTHER',lista_id:'proteina',activo:true},
];
const catalog = {listas:[{id:'creatina',activa:true},{id:'proteina',activa:true}],productos:products};

describe('Fase 7.3: relacionados por categoría', () => {
  it('excluye producto actual, otros vendedores del mismo producto y pruebas', () => {
    const output=selectRelatedProducts(products[0],catalog,[],10);
    expect(output.map(x=>x.producto.id)).toEqual(['B2','C']);
  });
  it('ordena por visitas agregadas y conserva alternativa si no hay datos', () => {
    const rows=[{product_id:'C',visitas:8},{product_id:'B2',visitas:1}];
    expect(selectRelatedProducts(products[0],catalog,rows).map(x=>x.producto.id)).toEqual(['C','B2']);
    expect(selectRelatedProducts(products[0],catalog,[])).toHaveLength(2);
  });
  it('omite categorías ocultas, productos no publicados y valores inválidos', () => {
    expect(selectRelatedProducts({...products[0],activo:false},catalog)).toEqual([]);
    expect(selectRelatedProducts({...products[0],es_prueba:true},catalog)).toEqual([]);
    expect(selectRelatedProducts(products[0],{...catalog,listas:[{id:'creatina',activa:false}]})).toEqual([]);
    const rows=[{product_id:'C',visitas:-4},{product_id:'C',visitas:0},{product_id:'C',visitas:3}];
    expect(selectRelatedProducts(products[0],catalog,rows).find(x=>x.producto.id==='C').visitas).toBe(3);
  });
  it('muestra enlaces internos y nunca añade enlaces comerciales desde recomendaciones', () => {
    const detail = readFileSync(new URL('../pages/producto/[id].astro',import.meta.url),'utf8');
    expect(detail).toContain('selectRelatedProducts(producto, catalog, relatedViews, 4)');
    expect(detail).toContain('Otros productos de');
    expect(detail).toContain('encodeURIComponent(relacionado.id)');
    expect(detail).toContain('getPublicProductImage(relacionado)');
    expect(detail).toContain("event_type = 'view'");
  });
});
