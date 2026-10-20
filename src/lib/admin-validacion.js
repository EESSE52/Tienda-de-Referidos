function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'producto';
}

function parsePrice(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = String(value).trim();
  if (!text) return null;

  const withoutSpaces = text.replace(/\s+/g, '');
  if (!withoutSpaces || withoutSpaces === '—' || withoutSpaces === 'null') return null;

  const hasDot = withoutSpaces.includes('.');
  const hasComma = withoutSpaces.includes(',');

  if (hasDot && hasComma) {
    const lastDot = withoutSpaces.lastIndexOf('.');
    const lastComma = withoutSpaces.lastIndexOf(',');
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const normalized = decimalSeparator === '.'
      ? withoutSpaces.replace(/,/g, '')
      : withoutSpaces.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (hasDot && !hasComma) {
    const segments = withoutSpaces.split('.');
    const last = segments[segments.length - 1];
    if (segments.length > 1 && /^\d{3}$/.test(last)) {
      return Number(withoutSpaces.replace(/\./g, ''));
    }
  }

  if (hasComma) {
    const lastComma = withoutSpaces.lastIndexOf(',');
    const decimalPart = withoutSpaces.slice(lastComma + 1);
    const integerPart = withoutSpaces.slice(0, lastComma);
    const hasOnlyThousands = /^\d{1,3}(\.\d{3})+$/.test(withoutSpaces);
    if (hasOnlyThousands) {
      return Number(withoutSpaces.replace(/\./g, '').replace(',', '.'));
    }
    if (decimalPart.length <= 2 && integerPart.length > 0) {
      return Number(withoutSpaces.replace(',', '.'));
    }
    return Number(withoutSpaces.replace(',', ''));
  }

  const numeric = Number(withoutSpaces);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normaliseProductPayload(payload = {}, existing = null) {
  const listaId = cleanText(payload.lista_id ?? existing?.lista_id ?? '');
  const nombre = cleanText(payload.nombre ?? existing?.nombre ?? '');
  const marca = cleanText(payload.marca ?? existing?.marca ?? '');
  const idPublicacion = cleanText(payload.id_publicacion ?? existing?.id_publicacion ?? '');
  const enlaceReferido = cleanText(payload.enlace_referido ?? payload.url_publicacion ?? existing?.enlace_referido ?? '');
  const urlPublicacion = cleanText(payload.url_publicacion ?? existing?.url_publicacion ?? payload.enlace_referido ?? '');
  const precio = parsePrice(payload.precio ?? existing?.precio ?? 0) ?? 0;
  const vendedor = cleanText(payload.vendedor ?? existing?.vendedor ?? '');
  const activo = payload.activo === undefined ? (existing ? existing.activo : true) : Boolean(payload.activo);
  const notas = cleanText(payload.notas ?? existing?.notas ?? '');
  const atributos = payload.atributos && typeof payload.atributos === 'object' ? payload.atributos : (existing?.atributos ?? {});
  const finalId = String(payload.id ?? existing?.id ?? `${slugify(nombre || 'producto')}-${Date.now()}`).trim();

  return {
    id: finalId,
    lista_id: listaId,
    nombre,
    marca,
    id_publicacion: idPublicacion,
    enlace_referido: enlaceReferido,
    url_publicacion: urlPublicacion,
    precio,
    fecha_precio: payload.fecha_precio || existing?.fecha_precio || new Date().toISOString().slice(0, 10),
    vendedor: vendedor || marca || 'Sin vendedor',
    activo,
    imagen: cleanText(payload.imagen ?? existing?.imagen ?? ''),
    notas,
    atributos,
    historial_precios: Array.isArray(payload.historial_precios)
      ? payload.historial_precios
      : (Array.isArray(existing?.historial_precios) ? existing.historial_precios : [{ fecha: new Date().toISOString().slice(0, 10), precio }]),
    creado: existing?.creado || new Date().toISOString(),
    actualizado: new Date().toISOString(),
  };
}

export function validateProductPayload(payload, productos = [], existingId = null) {
  const product = normaliseProductPayload(payload, productos.find((item) => item.id === existingId) || null);

  if (!product.lista_id) {
    throw new Error('Debes seleccionar una lista válida.');
  }

  if (!product.nombre) {
    throw new Error('El nombre del referid es obligatorio.');
  }

  const link = product.enlace_referido || product.url_publicacion;
  if (!link) {
    throw new Error('Debes pegar un enlace o URL del producto.');
  }

  if (!Number.isFinite(product.precio) || product.precio <= 0) {
    throw new Error('El precio debe ser un número mayor a 0.');
  }

  const normalizedName = product.nombre.toLowerCase();
  const normalizedLink = link.toLowerCase();

  const duplicate = productos.find((item) => {
    if (existingId && item.id === existingId) return false;
    if (item.lista_id !== product.lista_id) return false;
    const itemName = String(item.nombre ?? '').toLowerCase();
    const itemLink = String(item.enlace_referido || item.url_publicacion || '').toLowerCase();
    return itemName === normalizedName || itemLink === normalizedLink;
  });

  if (duplicate) {
    throw new Error('Ya existe un referid duplicado en esta lista. Revisa el nombre o el enlace.');
  }

  return product;
}
