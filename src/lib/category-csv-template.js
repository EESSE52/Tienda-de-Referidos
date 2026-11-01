const COMMON_COLUMNS = [
  'lista_id', 'nombre', 'marca', 'precio', 'enlace_referido',
  'id_publicacion', 'imagen', 'activo', 'es_prueba',
];

/** Cabecera CSV sin fórmulas ni valores inventados, compatible con el importador. */
export function categoryCsvColumns(category) {
  if (!category || typeof category !== 'object' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(category.id || ''))) {
    throw new Error('Categoría inválida.');
  }
  const columns = [...COMMON_COLUMNS];
  const seen = new Set(columns);
  for (const field of Array.isArray(category.campos) ? category.campos : []) {
    const key = String(field?.clave || '').trim();
    if (!/^[a-z][a-z0-9_]*$/.test(key) || seen.has(key)) continue;
    columns.push(key);
    seen.add(key);
  }
  return columns;
}

export function generateCategoryCsvTemplate(category) {
  const columns = categoryCsvColumns(category);
  const quote = text => '"' + String(text).replace(/"/g, '""') + '"';
  // BOM para Excel; datos vacíos y solo una fila de encabezados.
  return '\uFEFF' + columns.map(quote).join(',') + '\r\n';
}
