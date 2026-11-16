import { describe, it, expect } from 'vitest';
import { selectGuidePhotos } from './guide-media.js';

const photo = (id, image, list='creatina') => ({
  id, nombre: 'Creatina monohidrato 300 g', imagen_propia:image, lista_id:list,
  activo:true, es_prueba:false
});
const p1=photo('a','https://images.example.com/creatina-a.jpg');
const p2=photo('b','https://images.example.com/creatina-b.jpg');
const whey=photo('c','https://images.example.com/whey.jpg','proteina');
const catalog={
  getListaBySlug:slug=>({id:slug}),
  getProductosByListaId:id=>[p1,p2,whey].filter(p=>p.lista_id===id)
};
const guides=[
  {slug:'mejor-creatina-chile',listSlug:'creatina'},
  {slug:'creatina-300-vs-500',listSlug:'creatina'},
  {slug:'comparar-proteinas-whey',listSlug:'proteina'}
];

describe('fotos distintas para guías',()=>{
  it('no repite imágenes disponibles entre dos artículos de creatina',()=>{
    const selected=selectGuidePhotos(guides,catalog);
    expect(selected.get(guides[0].slug).image).not.toEqual(selected.get(guides[1].slug).image);
  });
  it('elige de modo determinista, igual en índice y artículo',()=>{
    const first=selectGuidePhotos(guides,catalog);
    const second=selectGuidePhotos(guides,catalog);
    for (const g of guides) expect(first.get(g.slug).image).toBe(second.get(g.slug).image);
  });
  it('respeta la categoría de la publicación',()=>{
    const selected=selectGuidePhotos(guides,catalog);
    expect(selected.get('comparar-proteinas-whey').product.lista_id).toBe('proteina');
  });
});
