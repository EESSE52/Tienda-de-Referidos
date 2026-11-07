/** CSV de revisión: no guarda productos ni verifica afiliación. */
export function buildMercadoLibreReviewCsv(category, items) {
  if (!category || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(category.id || ''))) {
    throw new Error('Selecciona una categoría válida.');
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 10) {
    throw new Error('Selecciona entre 1 y 10 publicaciones válidas.');
  }
  const fixed = ['lista_id', 'nombre', 'marca', 'precio', 'enlace_referido', 'url_publicacion', 'id_publicacion', 'imagen', 'activo', 'es_prueba'];
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
      enlace_referido: Object.hasOwn(item, 'enlace_referido') ? item.enlace_referido : item.url_publicacion,
      url_publicacion: item.url_publicacion,
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

/** Producto revisado manualmente cuando la API no está disponible. */
export function createManualMercadoLibreCandidate(input) {
  let url;
  try { url = new URL(String(input?.url || '').trim()); } catch { throw new Error('Introduce la URL completa del producto.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !['mercadolibre.cl', 'www.mercadolibre.cl', 'articulo.mercadolibre.cl'].includes(url.hostname.toLowerCase())) {
    throw new Error('Solo puedes usar una publicación HTTPS de Mercado Libre Chile.');
  }
  const userProduct = url.pathname.match(/\/up\/MLCU[0-9]{6,}(?:\/|$)/i);
  const wid = new URLSearchParams(url.hash.slice(1)).get('wid') || url.searchParams.get('wid') || '';
  const inPath = url.pathname.match(/(?:^|[^a-z0-9])MLC[-_]?([0-9]{6,})(?=[^0-9]|$)/i);
  // En fichas /p/MLC... el ID de la ficha puede ser diferente al de
  // la publicación específica del vendedor (wid=MLC...). Para el CSV debe
  // prevalecer wid cuando es un ID de publicación válido.
  const validWid = /^MLC[0-9]{6,}$/i.test(wid) ? wid.toUpperCase() : '';
  const id = userProduct ? validWid : (validWid || (inPath ? 'MLC' + inPath[1] : ''));
  if (!id) throw new Error('Necesitas un enlace con publicación MLC o una ficha MLCU con wid=MLC.');
  const name = String(input?.name || '').trim();
  const brand = String(input?.brand || '').trim();
  const price = Number(input?.price);
  if (!name || name.length > 200 || !Number.isSafeInteger(price) || price <= 0) {
    throw new Error('Introduce un nombre y un precio CLP entero positivo, revisados en Mercado Libre.');
  }
  const affiliate = String(input?.affiliate_url || '').trim();
  if (affiliate && !isValidAffiliateUrl(affiliate)) throw new Error('El enlace de afiliado debe ser HTTPS de meli.la o Mercado Libre Chile.');
  const image = String(input?.image || '').trim();
  if (image) {
    let imageUrl;
    try { imageUrl = new URL(image); } catch { throw new Error('La URL de imagen no es válida.'); }
    if (imageUrl.protocol !== 'https:') throw new Error('La imagen debe usar HTTPS.');
  }
  return {
    name, brand, price, image, id_publicacion: id, url_publicacion: url.href, enlace_referido: affiliate,
    attributes: input?.attributes && typeof input.attributes === 'object' && !Array.isArray(input.attributes) ? { ...input.attributes } : {}, manual_price: true, afiliado_verificado: false,
  };
}

/** El enlace de afiliado se conserva íntegro, sin eliminar códigos de seguimiento. */
export function isValidAffiliateUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['meli.la', 'mercadolibre.cl', 'www.mercadolibre.cl', 'articulo.mercadolibre.cl'].includes(url.hostname.toLowerCase()) &&
      url.href.length <= 2048;
  } catch { return false; }
}
