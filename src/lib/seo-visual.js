// Se almacenan exclusivamente IDs de productos del catálogo y texto plano.
// Nunca se interpreta HTML proporcionado por el editor.
export const emptyVisual = () => ({coverProductId:'', galleryProductIds:[], relatedProductIds:[], sections:[], faqs:[]});

export function parseVisual(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyVisual();
    return {
      coverProductId: typeof data.coverProductId === 'string' ? data.coverProductId : '',
      galleryProductIds: Array.isArray(data.galleryProductIds) ? data.galleryProductIds.filter(v=>typeof v==='string').slice(0,8) : [],
      relatedProductIds: Array.isArray(data.relatedProductIds) ? data.relatedProductIds.filter(v=>typeof v==='string').slice(0,6) : [],
      sections: Array.isArray(data.sections) ? data.sections.filter(v=>v && typeof v.heading==='string' && typeof v.body==='string').slice(0,12) : [],
      faqs: Array.isArray(data.faqs) ? data.faqs.filter(v=>v && typeof v.q==='string' && typeof v.a==='string').slice(0,12) : [],
    };
  } catch { return emptyVisual(); }
}

export function validateVisual(raw, allowedProducts = []) {
  const v = parseVisual(raw);
  const ids = new Set(allowedProducts.map(p=>p.id));
  const valid = id => typeof id === 'string' && ids.has(id);
  if (v.coverProductId && !valid(v.coverProductId)) throw new Error('La fotografía principal debe pertenecer al catálogo activo.');
  if (v.galleryProductIds.some(id=>!valid(id)) || v.relatedProductIds.some(id=>!valid(id))) throw new Error('Se detectaron productos desconocidos o inactivos.');
  if (new Set(v.galleryProductIds).size !== v.galleryProductIds.length || new Set(v.relatedProductIds).size !== v.relatedProductIds.length) throw new Error('Hay productos repetidos.');
  if (v.sections.some(s=>s.heading.length>120 || s.body.length>2500 || !s.heading.trim() || !s.body.trim())) throw new Error('Revisa los subtítulos y el contenido de las secciones.');
  if (v.faqs.some(s=>s.q.length>200 || s.a.length>1200 || !s.q.trim() || !s.a.trim())) throw new Error('Revisa las preguntas frecuentes.');
  if (JSON.stringify(v).length>18000) throw new Error('Datos visuales demasiado extensos.');
  return v;
}
