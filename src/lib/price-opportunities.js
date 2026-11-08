// Oportunidades basadas exclusivamente en dos precios registrados del mismo producto.
// No implican promociones, stock ni descuentos confirmados por la tienda.
const validDay = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)
  && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
const validPrice = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function priceChange(product) {
  if (!product || product.activo !== true || product.es_prueba === true ||
      !validDay(product.fecha_precio) || !validPrice(product.precio)) return null;
  const points = (Array.isArray(product.historial_precios) ? product.historial_precios : [])
    .filter(item => item && validDay(item.fecha) && validPrice(item.precio)
      && item.fecha < product.fecha_precio)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!points.length) return null;
  const previous = points[0];
  const change = product.precio - previous.precio;
  return {
    current: product.precio, previous: previous.precio,
    currentDate: product.fecha_precio, previousDate: previous.fecha,
    difference: Math.abs(change),
    percent: Math.abs(change) / previous.precio * 100,
    direction: change < 0 ? 'baja' : change > 0 ? 'sube' : 'igual',
  };
}

export function selectPriceDrops(catalog, limit = 6) {
  const activeLists = new Set((catalog?.listas || [])
    .filter(item => item.activa !== false).map(item => item.id));
  const max = Number.isInteger(limit) ? Math.max(0, Math.min(limit, 12)) : 6;
  return (catalog?.productos || [])
    .filter(product => activeLists.has(product.lista_id))
    .map(product => ({ producto: product, cambio: priceChange(product) }))
    .filter(item => item.cambio?.direction === 'baja')
    .sort((a,b) => b.cambio.percent - a.cambio.percent ||
      b.cambio.difference - a.cambio.difference ||
      String(a.producto.id).localeCompare(String(b.producto.id)))
    .slice(0,max);
}
