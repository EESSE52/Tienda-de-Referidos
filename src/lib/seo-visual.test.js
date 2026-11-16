import { describe,expect,it } from 'vitest';
import { emptyVisual,parseVisual,validateVisual } from './seo-visual.js';

const products=[{id:'creatina-A'},{id:'proteina-B'}];

describe('editor visual SEO',()=>{
  it('mantiene las guías anteriores sin metadatos',()=>{
    expect(parseVisual(null)).toEqual(emptyVisual());
    expect(parseVisual('texto inválido')).toEqual(emptyVisual());
  });
  it('valida portada, galería, relacionados, secciones y preguntas',()=>{
    const input={coverProductId:'creatina-A',galleryProductIds:['proteina-B'],relatedProductIds:['creatina-A'],sections:[{heading:'Comparación',body:'Contenido educativo'}],faqs:[{q:'¿Qué comparar?',a:'Revisa las etiquetas.'}]};
    expect(validateVisual(input,products)).toEqual(input);
  });
  it('rechaza referencias a productos ajenos al catálogo activo',()=>{
    expect(()=>validateVisual({coverProductId:'no-existe'},products)).toThrow();
  });
  it('rechaza referencias duplicadas',()=>{
    expect(()=>validateVisual({galleryProductIds:['creatina-A','creatina-A']},products)).toThrow();
  });
  it('rechaza secciones demasiado extensas',()=>{
    expect(()=>validateVisual({sections:[{heading:'Titulo',body:'x'.repeat(2501)}]},products)).toThrow();
  });
});
