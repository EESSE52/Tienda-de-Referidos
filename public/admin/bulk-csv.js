/** CSV de revisión: no guarda productos ni verifica afiliación. */
export function buildMercadoLibreReviewCsv(category, items) {
  if (!category || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(category.id || ''))) {
    throw new Error('Selecciona una categoría válida.');
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 10) {
    throw new Error('Selecciona entre 1 y 10 publicaciones válidas.');
  }
  const fixed = ['lista_id', 'nombre', 'marca', 'precio', 'enlace_referido', 'id_publicacion', 'imagen', 'activo', 'es_prueba'];
  const attributes = (Array.isArray(category.campos) ? category.campos : [])
    .map(field => String(field.clave || ''))
    .filter((key, index, all) => /^[a-z][a-z0-9_]*$/.test(key) && !fixed.includes(key) && all.indexOf(key) === index);
  const columns = [...fixed, ...attributes];
  const csvCell = value => {
    const raw = String(value ?? '');
    // Excel interpreta estos prefijos como fórmulas; mantener los datos como texto.
    const guarded = /^[\s\uFEFF]*[=+\-@]/.test(raw) ? "'" + raw : raw;
    return '"' + guarded.replace(/"/g, '""') + '"';
  };
  const rows = items.map(item => {
    if (!/^MLC[0-9]{6,}$/.test(String(item.id_publicacion || ''))
      || !item.name || !Number.isSafeInteger(Number(item.price)) || Number(item.price) <= 0
      || !/^https:\/\/(?:www\.|articulo\.)?mercadolibre\.cl\//.test(String(item.url_publicacion || ''))) {
      throw new Error('La publicación no tiene datos suficientes para exportar.');
    }
    const values = {
      lista_id: category.id,
      nombre: item.name,
      marca: item.brand,
      precio: item.price,
      enlace_referido: item.url_publicacion,
      id_publicacion: item.id_publicacion,
      imagen: item.image,
      activo: 'false',
      es_prueba: 'false',
    };
    for (const key of attributes) values[key] = item.attributes?.[key] ?? '';
    return columns.map(key => csvCell(values[key])).join(',');
  });
  return '\uFEFF' + columns.map(csvCell).join(',') + '\r\n' + rows.join('\r\n') + '\r\n';
}
