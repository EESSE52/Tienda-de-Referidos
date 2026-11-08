const EVENT_TYPES = new Set(['view', 'affiliate_click']);
const PLACEMENTS = new Set(['product', 'category_card', 'category_table', 'comparison', 'seller_offer']);
export function validateAnalyticsEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const event = String(body.event || '');
  const productId = String(body.product_id || '');
  const placement = String(body.placement || '');
  if (!EVENT_TYPES.has(event) || !/^[a-zA-Z0-9_-]{3,100}$/.test(productId)) return null;
  if (event === 'view' && placement !== 'product') return null;
  if (event === 'affiliate_click' && !PLACEMENTS.has(placement)) return null;
  return { event, productId, placement };
}
export function displayAnalytics(rows, catalog, days = 30) {
  const products = new Map(catalog.productos.map(p => [p.id, p]));
  const byProduct = new Map();
  let views = 0, clicks = 0;
  const byCategory = new Map(), bySeller = new Map();
  for (const row of rows) {
    const product = products.get(row.product_id);
    if (!product || product.es_prueba || !product.activo) continue;
    const n = Number(row.total);
    if (!Number.isSafeInteger(n) || n < 0) continue;
    const key = product.id;
    const entry = byProduct.get(key) || {
      id: key, nombre: product.nombre, categoria: product.lista_id,
      vendedor: product.vendedor_nombre || product.vendedor || 'Sin vendedor',
      visitas: 0, clics: 0,
    };
    if (row.event_type === 'view') { entry.visitas += n; views += n; }
    if (row.event_type === 'affiliate_click') { entry.clics += n; clicks += n; }
    byProduct.set(key, entry);
  }
  for (const item of byProduct.values()) {
    const cat = byCategory.get(item.categoria) || { categoria: item.categoria, visitas: 0, clics: 0 };
    cat.visitas += item.visitas; cat.clics += item.clics; byCategory.set(item.categoria, cat);
    const sellerKey = item.categoria + ':' + item.vendedor;
    const seller = bySeller.get(sellerKey) || { vendedor: item.vendedor, categoria: item.categoria, visitas: 0, clics: 0 };
    seller.visitas += item.visitas; seller.clics += item.clics; bySeller.set(sellerKey, seller);
  }
  const sort = (a,b) => b.clics - a.clics || b.visitas - a.visitas;
  return {
    days, totals: { visitas: views, clics: clicks },
    products: [...byProduct.values()].sort(sort).slice(0,50),
    categories: [...byCategory.values()].sort(sort),
    sellers: [...bySeller.values()].sort(sort),
    disclaimer: 'Eventos aproximados, no usuarios únicos, ventas ni comisiones confirmadas.',
  };
}
