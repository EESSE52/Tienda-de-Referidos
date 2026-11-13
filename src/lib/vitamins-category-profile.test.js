import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vitaminsCategoryProfile } from './vitamins-category-profile.js';

vi.mock('./cloudflare-catalog.js', () => ({readCatalog: vi.fn(),saveRecord: vi.fn()}));
import { readCatalog,saveRecord } from './cloudflare-catalog.js';
import { createAdminCategory } from './admin-categories.js';
import { validateImportBatch } from './admin-import.js';
import { normalizeImportRow } from './normalize-import-row.js';

beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(readCatalog).mockResolvedValue({
    listas:[{id:'creatina',slug:'creatina',nombre:'Creatina'},{id:'amino',slug:'amino',nombre:'Aminoácidos'}],
    productos:[],
  });
  vi.mocked(saveRecord).mockResolvedValue(undefined);
});

describe('perfil de vitaminas y minerales',()=>{
  it('crea una categoría específica sin copiar campos de creatina',async()=>{
    const category=await createAdminCategory({}, {slug:'vitaminas',aplicar_perfil_vitaminas:true});
    expect(category).toMatchObject({id:'vitaminas',slug:'vitaminas',activa:true});
    expect(category.campos.map(x=>x.clave)).toContain('magnesio_elemental_mg');
    expect(category.campos.map(x=>x.clave)).not.toContain('dosis_3g');
    expect(category.metricas.map(x=>x.clave)).toEqual(['precio_por_porcion','precio_por_unidad']);
    expect(saveRecord).toHaveBeenCalledWith({}, 'catalog_lists', category);
  });
  it('rechaza slug distinto, plantilla incompatible y duplicado',async()=>{
    await expect(createAdminCategory({}, {slug:'creatina',aplicar_perfil_vitaminas:true})).rejects.toThrow('slug');
    await expect(createAdminCategory({}, {slug:'vitaminas',aplicar_perfil_vitaminas:true,plantilla_id:'creatina'})).rejects.toThrow('plantilla');
    vi.mocked(readCatalog).mockResolvedValueOnce({listas:[vitaminsCategoryProfile()],productos:[]});
    await expect(createAdminCategory({}, {slug:'vitaminas',aplicar_perfil_vitaminas:true})).rejects.toMatchObject({status:409});
  });
  it('acepta ZMA con dosis elementales desconocidas y conserva identificador del vendedor',()=>{
    const p=vitaminsCategoryProfile();
    const row={
      lista_id:'vitaminas', nombre:'Extremo Sur ZMA Zinc Magnesio B6 90 cápsulas',
      marca:'Extremo Sur', precio:'9990', activo:'false',
      id_publicacion:'MLC1459302767',
      url_publicacion:'https://www.mercadolibre.cl/zma/p/MLC27068978#wid=MLC1459302767',
      enlace_referido:'https://www.mercadolibre.cl/zma/p/MLC27068978#wid=MLC1459302767',
      tipo_suplemento:'Combinación ZMA',formato:'Cápsulas',
      cantidad_unidades:'90',porciones:'90',peso_por_porcion_mg:'500',sabor:'Sin sabor',
    };
    const res=validateImportBatch([row],{listas:[p],productos:[]},normalizeImportRow);
    expect(res.errors).toEqual([]);
    expect(res.accepted).toHaveLength(1);
    const item=res.accepted[0];
    expect(item.activo).toBe(false);
    expect(item.atributos.cantidad_unidades).toBe(90);
    expect(item.atributos.zinc_elemental_mg).toBeUndefined();
    expect(item.atributos.magnesio_elemental_mg).toBeUndefined();
    expect(item.id_publicacion).toBe('MLC1459302767');
  });
});
