// Estado de antigüedad del precio registrado. Solo usa datos ya guardados.
// Fecha YYYY-MM-DD interpretada como día UTC para no depender de la zona del navegador.
export function priceAgeStatus(product, now = new Date(), limitDays = 14) {
  if (product?.es_prueba === true) return { status: 'prueba', days: null, label: 'Producto de prueba' };
  if (product?.activo !== true) return { status: 'inactivo', days: null, label: 'Inactivo' };
  const raw = String(product?.fecha_precio ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { status: 'sin_fecha', days: null, label: 'Sin fecha válida' };
  const parsed = Date.parse(raw + 'T00:00:00Z');
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== raw)
    return { status: 'sin_fecha', days: null, label: 'Sin fecha válida' };
  const current = new Date(now);
  if (!Number.isFinite(current.getTime())) throw new Error('Fecha actual inválida');
  const days = Math.floor((Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()) - parsed) / 86400000);
  if (days < 0) return { status: 'fecha_futura', days, label: 'Fecha futura: revisar' };
  if (days > limitDays) return { status: 'vencido', days, label: 'Revisar: ' + days + ' días' };
  return { status: 'vigente', days, label: 'Registrado hace ' + days + ' días' };
}

export function summarizePriceAges(products, now = new Date(), limitDays = 14) {
  const summary = { vigente: 0, vencido: 0, sin_fecha: 0, fecha_futura: 0, inactivo: 0, prueba: 0 };
  for (const product of products) summary[priceAgeStatus(product, now, limitDays).status]++;
  return summary;
}
