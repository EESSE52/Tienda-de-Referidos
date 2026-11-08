// Informe de consultas en lote: solo lectura, no prueba stock ni afiliación.
export function summarizeBatchReviews(rows) {
  const totals = { consultados: 0, bajas: 0, subidas: 0, sin_cambio: 0, fallidos: 0 };
  for (const row of rows) {
    if (row.estado === 'error') totals.fallidos++;
    else if (row.estado === 'baja') { totals.consultados++; totals.bajas++; }
    else if (row.estado === 'subida') { totals.consultados++; totals.subidas++; }
    else if (row.estado === 'sin_cambio') { totals.consultados++; totals.sin_cambio++; }
  }
  return totals;
}

export function classifyBatchReview(review) {
  const current = Number(review?.precio_actual);
  const proposed = Number(review?.precio_consultado);
  if (!Number.isSafeInteger(current) || current <= 0 ||
      !Number.isSafeInteger(proposed) || proposed <= 0) throw new Error('Precios no válidos');
  return proposed < current ? 'baja' : proposed > current ? 'subida' : 'sin_cambio';
}

const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';
export function batchReviewCsv(rows) {
  const header = ['Producto','ID publicación','Precio catálogo CLP','Precio consultado CLP','Variación CLP','Estado consulta','Disponibilidad','Observación'];
  const content = rows.map(row => [
    row.nombre, row.id_publicacion, row.precio_actual, row.precio_consultado,
    Number.isFinite(row.precio_actual) && Number.isFinite(row.precio_consultado)
      ? row.precio_consultado - row.precio_actual : '',
    row.estado, 'No verificada', row.observacion || '',
  ]);
  return '\uFEFF' + [header, ...content].map(cells => cells.map(csvCell).join(';')).join('\r\n');
}
