// Resumen determinista de comparación: sin puntuaciones inventadas ni recomendación patrocinada.
export function summarizeComparison(products, lists) {
  if (!Array.isArray(products) || products.length < 2) return { comparable: false, price: null, metrics: [] };
  const categories = new Set(products.map(p => p.lista_id));
  const comparable = categories.size === 1 && lists.some(l => l.id === products[0].lista_id && l.activa !== false);
  if (!comparable) return { comparable: false, price: null, metrics: [] };

  const validPrice = products.map(p => ({ product: p, value: Number(p.precio) }))
    .filter(item => Number.isFinite(item.value) && item.value > 0);
  let price = null;
  if (validPrice.length === products.length) {
    const low = Math.min(...validPrice.map(p => p.value));
    const high = Math.max(...validPrice.map(p => p.value));
    price = {
      winners: validPrice.filter(p => p.value === low).map(p => ({ id: p.product.id, name: p.product.nombre })),
      lowest: low,
      highest: high,
      difference: high - low,
      percent: low > 0 ? (high - low) / low * 100 : null,
    };
  }

  const list = lists.find(l => l.id === products[0].lista_id);
  const metrics = [];
  for (const metric of list?.metricas || []) {
    const formula = metric.plantilla ?? metric.formula;
    if (!formula || !['precio_dividido_por', 'campo_dividido_por'].includes(formula.tipo)) continue;
    if (metric.mejor !== 'menor' && metric.mejor !== 'mayor') continue;

    const values = products.map(p => calculateMetric(p, formula));
    if (values.some(value => value === null)) continue;
    const best = metric.mejor === 'menor' ? Math.min(...values) : Math.max(...values);
    metrics.push({
      key: metric.clave,
      label: metric.etiqueta,
      direction: metric.mejor,
      formulaType: formula.tipo,
      winners: products.filter((_, i) => values[i] === best).map(p => ({id:p.id,name:p.nombre})),
      value: best,
      comparableCount: products.length,
    });
  }
  return { comparable, price, metrics };
}

function calculateMetric(product, formula) {
  const field = key => {
    const raw = key === 'precio' ? product.precio : (product.atributos || {})[key];
    if (raw === null || raw === undefined || String(raw).trim() === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  if (formula.tipo === 'precio_dividido_por') {
    const price = field('precio'), units = field(formula.campo);
    return price > 0 && units > 0 ? price / units : null;
  }
  if (formula.tipo === 'campo_dividido_por') {
    const a = field(formula.campo_a), b = field(formula.campo_b);
    return a !== null && b !== null && b !== 0 ? a / b : null;
  }
  return null;
}
