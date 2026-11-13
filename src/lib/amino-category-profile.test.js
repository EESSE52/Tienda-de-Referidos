import { describe, expect, it } from 'vitest';
import { aminoCategoryProfile } from './amino-category-profile.js';
import { validateImportBatch } from './admin-import.js';
import { normalizeImportRow } from './normalize-import-row.js';

const category=aminoCategoryProfile({ id:'amino',slug:'amino',nombre:'Aminoacidos',campos:[],metricas:[],activa:true });
const rows=[
  { lista_id:'amino',nombre:'L-Lisina Nutracore 120 cápsulas',marca:'Nutracore',precio:'18490',
    enlace_referido:'https://meli.la/1sQ6G8E',url_publicacion:'https://www.mercadolibre.cl/p/MLC55631138#wid=MLC3189185440',
    id_publicacion:'MLC3189185440',ingrediente:'L-lisina',formato:'Cápsulas',
    cantidad_unidades:'120',porciones:'60',mg_activo_por_porcion:'1140',activo:'false' },
  { lista_id:'amino',nombre:'Swanson NAC 60 cápsulas',marca:'Swanson',precio:'24990',
    enlace_referido:'https://meli.la/2Ap2rfp',url_publicacion:'https://www.mercadolibre.cl/p/MLC36039607#wid=MLC1574560871',
    id_publicacion:'MLC1574560871',ingrediente:'NAC',formato:'Cápsulas',cantidad_unidades:'60',
    porciones:'',mg_activo_por_porcion:'',activo:'false' },
  { lista_id:'amino',nombre:'Alpha Medica Glutamina 300 g',marca:'Alpha Medica',precio:'7358',
    enlace_referido:'https://meli.la/1h9nD6e',url_publicacion:'https://www.mercadolibre.cl/p/MLC28389934#wid=MLC2128229810',
    id_publicacion:'MLC2128229810',ingrediente:'L-glutamina',formato:'Polvo',gramos_total:'300',
    porciones:'60',mg_activo_por_porcion:'5000',sabor:'Sin sabor',activo:'false' },
];
describe('perfil Aminoácidos sin copiar Creatina',()=>{
  it('conserva ID y slug existentes y separa cápsulas de polvo',()=>{
    expect(category.id).toBe('amino');
    expect(category.slug).toBe('amino');
    expect(category.campos.some(x=>x.clave==='dosis_3g')).toBe(false);
    expect(category.campos.find(x=>x.clave==='formato').opciones).toContain('Cápsulas');
  });
  it('acepta los tres productos sin inventar dosis de NAC',()=>{
    const res=validateImportBatch(rows,{listas:[category],productos:[]},normalizeImportRow);
    expect(res.errors).toEqual([]);
    expect(res.accepted).toHaveLength(3);
    expect(res.accepted.every(x=>x.activo===false)).toBe(true);
    expect(res.accepted[1].atributos.mg_activo_por_porcion).toBeUndefined();
    expect(res.accepted[2].atributos.gramos_total).toBe(300);
    expect(res.accepted.map(x=>x.enlace_referido)).toEqual(rows.map(x=>x.enlace_referido));
  });
  it('impide aplicar perfil a una categoría distinta',()=>{
    expect(()=>aminoCategoryProfile({...category,id:'creatina'})).toThrow();
  });
});
