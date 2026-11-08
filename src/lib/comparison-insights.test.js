import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { summarizeComparison } from './comparison-insights.js';

const lista = {
  id: 'creatina', activa: true,
  metricas: [
    { clave: 'costo_gramo', etiqueta: 'Precio por gramo', mejor: 'menor',
      plantilla: { tipo: 'precio_dividido_por', campo: 'gramos_total' } },
    { clave: 'cantidad', etiqueta: 'Porciones por envase', mejor: 'mayor',
      plantilla: { tipo: 'campo_dividido_por', campo_a: 'porciones', campo_b: 'envases' } },
  ],
};
const a = { id: 'A', nombre: 'A', lista_id: 'creatina', precio: 10000, atributos: { gramos_total: 100, porciones: 20, envases: 1 } };
const b = { id: 'B', nombre: 'B', lista_id: 'creatina', precio: 12000, atributos: { gramos_total: 200, porciones: 30, envases: 1 } };

describe('Fase 7.4: conclusiones objetivas del comparador', () => {
  it('identifica precio menor y costo por gramo, sin inventar ganador absoluto', () => {
    const result = summarizeComparison([a,b],[lista]);
    expect(result.comparable).toBe(true);
    expect(result.price.winners.map(x=>x.id)).toEqual(['A']);
    expect(result.price.difference).toBe(2000);
    expect(result.price.percent).toBe(20);
    expect(result.metrics.find(x=>x.key==='costo_gramo').winners.map(x=>x.id)).toEqual(['B']);
    expect(result.metrics.find(x=>x.key==='cantidad').winners.map(x=>x.id)).toEqual(['B']);
    expect(result).not.toHaveProperty('overallWinner');
  });
  it('no compara conclusiones entre categorías distintas', () => {
    expect(summarizeComparison([a,{...b,lista_id:'proteina'}],[lista]).comparable).toBe(false);
    expect(summarizeComparison([a,b],[{...lista,activa:false}]).metrics).toEqual([]);
  });
  it('omite cálculos unitarios sin datos y precios inválidos', () => {
    const result=summarizeComparison([a,{...b,precio:0,atributos:{gramos_total:0}}],[lista]);
    expect(result.price).toBeNull();
    expect(result.metrics).toEqual([]);
  });
  it('respeta empates y no asigna ventaja cuando ambos valores son iguales', () => {
    const result=summarizeComparison([a,{...a,id:'C',nombre:'C'}],[lista]);
    expect(result.price.winners).toHaveLength(2);
    expect(result.price.difference).toBe(0);
    expect(result.metrics[0].winners).toHaveLength(2);
  });
  it('explica en la interfaz las limitaciones de precio y métricas', () => {
    const page=readFileSync(new URL('../pages/comparador.astro',import.meta.url),'utf8');
    expect(page).toContain('summarizeComparison(productos, catalog.listas)');
    expect(page).toContain('Análisis de la comparación');
    expect(page).toContain('Mejores valores por criterio');
    expect(page).toContain('Precios referenciales sujetos a verificación');
    expect(page).toContain('producto?.es_prueba !== true');
  });
});
