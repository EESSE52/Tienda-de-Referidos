function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getMercadoLibreItemId(value) {
  const decoded = decodeURIComponent(String(value || ''));
  const match = decoded.match(/\b(ML[A-Z])[-_]?([0-9]{6,})\b/i);
  return match ? `${match[1]}${match[2]}`.toUpperCase() : '';
}

export function buildManualProductPayload(item, options = {}) {
  const url = String(options.url || item?.url_publicacion || item?.enlace_referido || '').trim();
  const idPublicacion = getMercadoLibreItemId(url) || String(item?.id_publicacion || '').trim();
  const nombre = String(item?.name || item?.nombre || '').trim();
  const marca = String(item?.brand || item?.marca || '').trim();
  const precio = Number.isFinite(Number(item?.price)) ? Number(item?.price) : Number(item?.precio || 0);
  const imagen = String(item?.image || item?.imagen || '').trim();
  const vendedor = String(item?.seller || item?.vendedor || '').trim();
  const atributos = item?.attributes || item?.atributos || {};

  const payload = {
    id: `producto-${slugify(nombre || idPublicacion || 'ml-item')}-${Date.now()}`,
    lista_id: String(options.lista_id || item?.lista_id || '').trim(),
    nombre,
    marca,
    precio,
    fecha_precio: new Date().toISOString().slice(0, 10),
    id_publicacion: idPublicacion,
    enlace_referido: url,
    url_publicacion: url,
    imagen,
    activo: true,
    vendedor,
    atributos,
    historial_precios: [{ fecha: new Date().toISOString().slice(0, 10), precio }],
  };

  return payload;
}
