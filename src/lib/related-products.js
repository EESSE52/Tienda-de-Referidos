import { getOfferGroupId } from './product-offers';

// Productos relacionados, no perfiles personales ni ofertas duplicadas del mismo artículo.
export function selectRelatedProducts(current, catalog, rows = [], limit = 4) {
  if (!current || current.activo !== true || current.es_prueba === true) return [];
  const lists = (catalog?.listas || []);
  if (!lists.some(list => list.id === current.lista_id && list.activa !== false)) return [];
  const currentGroup = getOfferGroupId(current);
  const views = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const visits = Number(row.visitas);
    if (!Number.isSafeInteger(visits) || visits <= 0) continue;
    const id = String(row.product_id ?? '');
    views.set(id, (views.get(id) || 0) + visits);
  }
  const groups = new Map();
  for (const candidate of catalog.productos || []) {
    if (candidate.activo !== true || candidate.es_prueba === true ||
        candidate.lista_id !== current.lista_id || candidate.id === current.id) continue;
    const group = getOfferGroupId(candidate);
    if (currentGroup && group === currentGroup) continue;
    const key = group ? 'group:' + group : 'product:' + candidate.id;
    const saved = groups.get(key);
    if (!saved || (Number(candidate.precio) > 0 &&
        (Number(saved.precio) <= 0 || Number(candidate.precio) < Number(saved.precio)))) {
      groups.set(key, candidate);
    }
  }
  const max = Number.isInteger(limit) ? Math.max(0, Math.min(limit, 8)) : 4;
  return [...groups.values()]
    .sort((a, b) => (views.get(String(b.id)) || 0) - (views.get(String(a.id)) || 0)
      || String(a.nombre).localeCompare(String(b.nombre), 'es')
      || String(a.id).localeCompare(String(b.id)))
    .slice(0, max)
    .map(producto => ({ producto, visitas: views.get(String(producto.id)) || 0 }));
}
