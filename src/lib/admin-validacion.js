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

function coerceBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  return Boolean(value);
}

export function normaliseProductPayload(payload = {}, existing = null) {
  const listaId = cleanText(payload.lista_id ?? existing?.lista_id ?? '');
  const nombre = cleanText(payload.nombre ?? existing?.nombre ?? '');
  const marca = cleanText(payload.marca ?? existing?.marca ?? '');
  const idCatalogo = cleanText(payload.id_catalogo ?? existing?.id_catalogo ?? '');
  const idPublicacion = cleanText(payload.id_publicacion ?? existing?.id_publicacion ?? '');
  const enlaceReferido = cleanText(payload.enlace_referido ?? payload.url_publicacion ?? existing?.enlace_referido ?? '');
  const urlPublicacion = cleanText(payload.url_publicacion ?? existing?.url_publicacion ?? payload.enlace_referido ?? '');
  const precio = parsePrice(payload.precio ?? existing?.precio ?? 0) ?? 0;
  const precioOriginal = parsePrice(payload.precio_original ?? existing?.precio_original ?? null);
  const vendedor = cleanText(payload.vendedor ?? existing?.vendedor ?? '');
  const vendedorNombre = cleanText(payload.vendedor_nombre ?? existing?.vendedor_nombre ?? (vendedor || marca || ''));
  const activo = payload.activo === undefined ? (existing ? existing.activo : true) : coerceBoolean(payload.activo, true);
  const esPrueba = coerceBoolean(payload.es_prueba ?? existing?.es_prueba ?? false, false);
  const notas = cleanText(payload.notas ?? existing?.notas ?? '');
  const atributos = payload.atributos && typeof payload.atributos === 'object' ? payload.atributos : (existing?.atributos ?? {});
  const finalId = String(payload.id ?? existing?.id ?? `${slugify(nombre || 'producto')}-${Date.now()}`).trim();
  const estadoOferta = cleanText(payload.estado_oferta ?? existing?.estado_oferta ?? 'sin_verificar') || 'sin_verificar';
  const imagenPropia = cleanText(payload.imagen_propia ?? existing?.imagen_propia ?? '');
  const imagenCandidata = cleanText(payload.imagen_candidata ?? existing?.imagen_candidata ?? '');
  const imagenFuente = cleanText(payload.imagen_fuente ?? existing?.imagen_fuente ?? '') || 'ml_api';
  const historial = Array.isArray(payload.historial_precios)
    ? payload.historial_precios
    : (Array.isArray(existing?.historial_precios) ? existing.historial_precios : [{ fecha: new Date().toISOString().slice(0, 10), precio }]);

  return {
    id: finalId,
    lista_id: listaId,
    nombre,
    marca,
    formato: cleanText(payload.formato ?? existing?.formato ?? ''),
    id_catalogo: idCatalogo,
    id_publicacion: idPublicacion,
    enlace_referido: enlaceReferido,
    url_publicacion: urlPublicacion,
    precio,
    precio_original: precioOriginal,
    fecha_precio: payload.fecha_precio || existing?.fecha_precio || new Date().toISOString().slice(0, 10),
    precio_fuente: cleanText(payload.precio_fuente ?? existing?.precio_fuente ?? 'manual') || 'manual',
    ultima_revision: cleanText(payload.ultima_revision ?? existing?.ultima_revision ?? new Date().toISOString()),
    estado_oferta: estadoOferta,
    vendedor: vendedor || marca || 'Sin vendedor',
    vendedor_nombre: vendedorNombre || vendedor || marca || 'Sin vendedor',
    vendedor_id: cleanText(payload.vendedor_id ?? existing?.vendedor_id ?? ''),
    reputacion_nivel: payload.reputacion_nivel ?? existing?.reputacion_nivel ?? null,
    mercadolider: payload.mercadolider ?? existing?.mercadolider ?? null,
    transacciones_total: payload.transacciones_total ?? existing?.transacciones_total ?? null,
    cuenta_activa: payload.cuenta_activa ?? existing?.cuenta_activa ?? null,
    reputacion_revisada: payload.reputacion_revisada ?? existing?.reputacion_revisada ?? null,
    en_promocion: coerceBoolean(payload.en_promocion ?? existing?.en_promocion ?? false, false),
    envio_gratis: coerceBoolean(payload.envio_gratis ?? existing?.envio_gratis ?? false, false),
    despacho_full: coerceBoolean(payload.despacho_full ?? existing?.despacho_full ?? false, false),
    tienda_oficial: coerceBoolean(payload.tienda_oficial ?? existing?.tienda_oficial ?? false, false),
    garantia: cleanText(payload.garantia ?? existing?.garantia ?? '') || null,
    activo,
    es_prueba: esPrueba,
    imagen: cleanText(payload.imagen ?? existing?.imagen ?? ''),
    imagen_propia: imagenPropia,
    imagen_candidata: imagenCandidata,
    imagen_fuente: imagenFuente,
    notas,
    atributos,
    historial_precios: historial,
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
