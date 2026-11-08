// Ranking público: eventos agregados, nunca perfiles ni ventas.
export function selectPopularProducts(rows, catalog, limit = 6) {
  const allowedLists = new Set((catalog.listas || [])
    .filter(list => list.activa !== false).map(list => list.id));
  const products = new Map((catalog.productos || [])
    .filter(product => product.activo === true && product.es_prueba !== true
      && allowedLists.has(product.lista_id))
    .map(product => [String(product.id), product]));
  const views = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row.product_id || '');
    if (!products.has(id)) continue;
    const count = Number(row.visitas);
    if (!Number.isSafeInteger(count) || count <= 0) continue;
    views.set(id, (views.get(id) || 0) + count);
  }
  const maxItems = Number.isInteger(limit) ? Math.min(12, Math.max(0, limit)) : 6;
  return [...views.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxItems)
    .map(([id, visitas]) => ({ producto: products.get(id), visitas }));
}
