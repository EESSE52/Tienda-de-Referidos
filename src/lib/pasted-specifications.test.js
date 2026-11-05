import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { previewPastedSpecifications, extractPastedPairs } from '../../public/admin/pasted-specs.js';

const sample = [
'Características del producto',
'Formato de venta: **Unidad**',
'Marca: **Ostrovit**',
'Unidades por envase: **166**',
'### Características generales',
'| **Marca** | Ostrovit |',
'| :--- | :--- |',
'| **Suplemento principal** | Creatina monohidratada |',
'| **Nombre comercial** | Creatine Monohydrate |',
'### Peso',
'| **Peso neto** | 500 g |',
'### Información nutricional',
'| **Peso de la porción** | 3 g |',
'| **Volumen de la porción** | 500 mL |',
'| **Ingredientes** | Creatina monohidratada |',
'| **Formato del suplemento** | Polvo |',
'| **Cantidad de porciones** | 200 |',
'| **Unidades por envase** | 166 |',
'| **Sabor** | Sandía |',
'| **Es libre de gluten** | Sí |',
'| **Es vegano** | Sí |',
'| **Contiene lactosa** | No |',
].join('\n');
const category = { campos: [
  { clave:'gramos_total', etiqueta:'Gramos totales', tipo:'numero' },
  { clave:'porciones', etiqueta:'Porciones', tipo:'numero' },
  { clave:'cantidad_unidades', etiqueta:'Cantidad de unidades', tipo:'numero' },
  { clave:'sabor', etiqueta:'Sabor', tipo:'texto' },
  { clave:'tipo', etiqueta:'Tipo', tipo:'seleccion', opciones:['Polvo', 'Gomitas'] },
  { clave:'libre_gluten', etiqueta:'Libre de gluten', tipo:'seleccion', opciones:['Sí', 'No'] },
] };
describe('ingreso manual por características pegadas', () => {
  it('extrae tablas markdown y líneas con dos puntos', () => {
    const pairs = extractPastedPairs(sample);
    expect(pairs).toContainEqual({ label:'Peso neto',value:'500 g' });
    expect(pairs).toContainEqual({ label:'Marca',value:'Ostrovit' });
    expect(pairs.some(p => p.label.includes('---'))).toBe(false);
  });
  it('separa los gramos, porciones y unidades sin inventar cantidades', () => {
    const result = previewPastedSpecifications(sample,category);
    expect(result.brand).toBe('Ostrovit');
    expect(result.mapped.gramos_total).toBe(500);
    expect(result.mapped.porciones).toBe(200);
    expect(result.mapped.cantidad_unidades).toBe(166);
    expect(result.mapped.sabor).toBe('Sandía');
    expect(result.mapped.tipo).toBe('Polvo');
    expect(result.mapped.libre_gluten).toBe('Sí');
    expect(result.unmatched).toContainEqual({label:'Peso de la porción',value:'3 g'});
    expect(result.unmatched).toContainEqual({label:'Contiene lactosa',value:'No'});
  });
  it('respeta campos configurados y no asigna unidades cuando la categoría no las ofrece', () => {
    const onlyWeight = previewPastedSpecifications(sample,{campos:category.campos.slice(0,1)});
    expect(onlyWeight.mapped).toEqual({gramos_total:500});
    expect(onlyWeight.unmatched.some(p=>p.label==='Unidades por envase')).toBe(true);
  });
  it('valida opciones y evita convertir volúmenes en gramos', () => {
    const result=previewPastedSpecifications('Peso neto: 500 mL\nFormato del suplemento: Tableta\nCantidad de porciones: 20',category);
    expect(result.mapped.gramos_total).toBeUndefined();
    expect(result.mapped.tipo).toBeUndefined();
    expect(result.mapped.porciones).toBe(20);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('no requiere API ni escribe automáticamente en D1', () => {
    const html=readFileSync(new URL('../../public/admin/index.html',import.meta.url),'utf8');
    expect(html).toContain('id="ml-pasted-specs"');
    expect(html).toContain('id="ml-pasted-analyze"');
    expect(html).toContain('id="ml-pasted-apply"');
    expect(html).toContain("import('/admin/pasted-specs.js')");
    expect(html).toContain('Vista previa preparada');
  });
});
