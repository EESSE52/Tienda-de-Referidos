import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { priceChange, selectPriceDrops } from './price-opportunities.js';

const product = (id, price, date, history = [], extra = {}) => ({
  id, nombre: id, lista_id: 'creatina', activo: true, es_prueba: false,
  precio: price, fecha_precio: date, historial_precios: history, ...extra,
});
const history = [{fecha:'2026-10-20',precio:15000},{fecha:'2026-10-25',precio:12000}];

describe('Fase 7.6: bajas de precios registradas', () => {
  it('compara con el registro anterior y calcula variación sin fingir una promoción', () => {
    const change = priceChange(product('A',10000,'2026-11-08',history));
    expect(change).toMatchObject({
      current:10000,previous:12000,previousDate:'2026-10-25',
      currentDate:'2026-11-08',difference:2000,direction:'baja',
    });
    expect(change.percent).toBeCloseTo(16.6667,3);
  });
  it('distingue subidas y precios iguales de las oportunidades', () => {
    expect(priceChange(product('A',14000,'2026-11-08',history)).direction).toBe('sube');
    expect(priceChange(product('A',12000,'2026-11-08',history)).direction).toBe('igual');
  });
  it('no crea tendencias con registros futuros, misma fecha, ceros o productos de prueba', () => {
    expect(priceChange(product('A',10000,'2026-11-08',[]))).toBeNull();
    expect(priceChange(product('A',10000,'2026-11-08',[{fecha:'2026-11-08',precio:20000}]))).toBeNull();
    expect(priceChange(product('A',10000,'2026-11-08',[{fecha:'2026-11-09',precio:20000}]))).toBeNull();
    expect(priceChange(product('A',0,'2026-11-08',history))).toBeNull();
    expect(priceChange(product('A',10000,'2026-02-30',history))).toBeNull();
    expect(priceChange(product('A',10000,'2026-11-08',history,{activo:false}))).toBeNull();
    expect(priceChange(product('A',10000,'2026-11-08',history,{es_prueba:true}))).toBeNull();
  });
  it('excluye categorías desactivadas y ordena bajadas reales por porcentaje', () => {
    const catalog = {
      listas:[{id:'creatina',activa:true},{id:'oculta',activa:false}],
      productos:[
        product('A',10000,'2026-11-08',history),
        product('B',6000,'2026-11-08',[{fecha:'2026-10-25',precio:12000}]),
        product('C',20000,'2026-11-08',history),
        product('D',1000,'2026-11-08',[{fecha:'2026-10-25',precio:10000}],{lista_id:'oculta'}),
      ],
    };
    expect(selectPriceDrops(catalog).map(x=>x.producto.id)).toEqual(['B','A']);
    expect(selectPriceDrops(catalog,1).map(x=>x.producto.id)).toEqual(['B']);
  });
  it('publica precios fechados en la portada y explica la variación en cada ficha', () => {
    const home = readFileSync(new URL('../pages/index.astro', import.meta.url),'utf8');
    const detail = readFileSync(new URL('../pages/producto/[id].astro',import.meta.url),'utf8');
    expect(home).toContain('selectPriceDrops(catalog, 6)');
    expect(home).toContain('Bajas de precio registradas');
    expect(home).toContain('No son descuentos ni disponibilidad confirmados');
    expect(detail).toContain('priceChange(producto)');
    expect(detail).toContain('Variación respecto del registro anterior');
    expect(detail).toContain('No representa una promoción verificada');
  });
});
