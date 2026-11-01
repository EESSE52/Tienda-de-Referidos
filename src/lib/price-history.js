/**
 * Presentación segura del historial. Nunca altera los registros originales.
 * Un ID con formato MLC no demuestra que la publicación exista.
 */
export function summarizePriceHistory(product) {
  const rows = Array.isArray(product?.historial_precios) ? product.historial_precios : [];
  const history = rows
    .filter((row) => row && typeof row.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.fecha)
      && Number.isFinite(Number(row.precio)) && Number(row.precio) > 0)
    .map((row) => ({ fecha: row.fecha, precio: Number(row.precio) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const lowest = history.length ? Math.min(...history.map((row) => row.precio)) : null;
  const highest = history.length ? Math.max(...history.map((row) => row.precio)) : null;
  return {
    history, lowest, highest, count: history.length,
    verifiedSource: false,
  };
}
