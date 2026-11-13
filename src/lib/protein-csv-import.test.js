import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeImportRow } from './normalize-import-row.js';
import { validateImportBatch } from './admin-import.js';

const protein = {
  id:'proteina',slug:'proteina',
  campos:[
    {clave:'gramos_total',etiqueta:'Gramos totales',tipo:'numero',requerido:true},
    {clave:'proteina_total',etiqueta:'Proteína total',tipo:'numero',requerido:true},
    {clave:'porciones',etiqueta:'Porciones',tipo:'numero',requerido:true},
    {clave:'tipo',etiqueta:'Tipo',tipo:'seleccion',opciones:['Whey','Caseína','Vegana','Mezcla'],requerido:true},
    {clave:'sabor',etiqueta:'Sabor',tipo:'texto'},
  ],
};
describe('importación de proteínas con CSV UTF-8 de Excel',()=>{
  it('el administrador elimina el BOM antes de interpretar lista_id',()=>{
    const html=readFileSync(new URL('../../public/admin/index.html',import.meta.url),'utf8');
    expect(html).toContain("content = String(content || '').replace(/^\\uFEFF/, '');");
    expect(html).toContain('No se pudo conectar con /api/admin/products/import');
  });
  it('conserva tres enlaces afiliados y campos nutricionales diferentes',()=>{
    const urls=['https://meli.la/2YyJ4Wh','https://meli.la/2shN6fk','https://meli.la/1EAugwa'];
    const ids=['MLC4246175796','MLC3912254204','MLC2854201972'];
    const names=['Winkler Nutrition Whey Pro Win','Nutrex Research IsoFit','Optimum Nutrition Whey Isolate'];
    const grams=[1000,2317,1320];
    const proteins=[780,1750,1100];
    const servings=[30,70,44];
    const rows=urls.map((link,i)=>({
      lista_id:'proteina',nombre:names[i],precio:'50000',
      enlace_referido:link,id_publicacion:ids[i],
      url_publicacion:'https://www.mercadolibre.cl/producto/p/MLC18561166#wid='+ids[i],
      gramos_total:String(grams[i]),proteina_total:String(proteins[i]),
      porciones:String(servings[i]),tipo:'Whey',sabor:'Vainilla',activo:'false',es_prueba:'false',
    }));
    const result=validateImportBatch(rows,{listas:[protein],productos:[]},normalizeImportRow);
    expect(result.errors).toEqual([]);
    expect(result.accepted).toHaveLength(3);
    result.accepted.forEach((item,i)=>{
      expect(item.lista_id).toBe('proteina');
      expect(item.enlace_referido).toBe(urls[i]);
      expect(item.id_publicacion).toBe(ids[i]);
      expect(item.atributos.proteina_total).toBe(proteins[i]);
      expect(item.activo).toBe(false);
    });
  });
});
