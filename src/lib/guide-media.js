import { getPublicProductImage } from './public-site';

// Selección determinista: portada y artículo usan la misma fotografía.
// Solo se consideran imágenes propias aprobadas por la lógica del catálogo.
const HINTS = {
  'mejor-creatina-chile': ['monohidrato', 'monohydrate', 'creatina'],
  'creatina-300-vs-500': ['500', '300', 'creatina'],
  'comparar-proteinas-whey': ['whey', 'proteina', 'protein', 'iso'],
  'como-elegir-suplementos': ['creatina', 'proteina', 'vitamina', 'suplemento'],
  'comparar-zma-vitaminas': ['zma', 'zinc', 'magnesio', 'vitamina']
};

const isRealPhoto = src => Boolean(src && !src.startsWith('/img/generica-'));

function candidatesForGuide(guide, catalog) {
  const list = catalog.getListaBySlug(guide.listSlug || 'creatina');
  if (!list) return [];
  const hints = HINTS[guide.slug] ?? [];
  return catalog.getProductosByListaId(list.id)
    .filter(p => p.activo === true && p.es_prueba !== true)
    .map(p => {
      const image = getPublicProductImage(p);
      const name = String(p.nombre || '').toLocaleLowerCase('es');
      const score = hints.reduce((total, hint, i) => total + (name.includes(hint) ? hints.length-i : 0), 0);
      return {product:p, image, score};
    })
    .sort((a,b) => Number(isRealPhoto(b.image)) - Number(isRealPhoto(a.image)) || b.score-a.score || String(a.product.id).localeCompare(String(b.product.id)));
}

export function selectGuidePhotos(guides, catalog) {
  const used = new Set();
  const result = new Map();
  for (const guide of guides) {
    const candidates = candidatesForGuide(guide, catalog);
    // No repetir una fotografía si existe otra diferente en su categoría.
    const selected = candidates.find(c => isRealPhoto(c.image) && !used.has(c.image))
      || candidates.find(c => !used.has(c.image))
      || candidates[0] || null;
    if (selected) used.add(selected.image);
    result.set(guide.slug, selected);
  }
  return result;
}
