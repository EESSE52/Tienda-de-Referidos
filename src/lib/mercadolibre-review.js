/**
 * Acepta únicamente enlaces de publicaciones chilenas de Mercado Libre.
 * Evita consultar URL arbitrarias; el servidor consulta la API usando solo el ID.
 */
export function normalizeChileMercadoLibreUrl(value) {
  const raw = String(value ?? '').trim();
  if (raw.length > 2048) throw new Error('El enlace es demasiado largo.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Introduce una URL completa de Mercado Libre.'); }
  if (url.protocol !== 'https:') throw new Error('Usa un enlace HTTPS de Mercado Libre.');
  const host = url.hostname.toLowerCase();
  if (!['mercadolibre.cl', 'www.mercadolibre.cl', 'articulo.mercadolibre.cl'].includes(host)) {
    throw new Error('Solo se permiten publicaciones de Mercado Libre Chile.');
  }
  if (url.username || url.password || url.port) throw new Error('El enlace contiene parámetros de acceso no permitidos.');
  const match = url.pathname.match(/(?:^|[^a-z0-9])MLC[-_]?([0-9]{6,})(?=[^0-9]|$)/i);
  if (!match) throw new Error('El enlace debe contener un ID de publicación MLC válido.');
  // Elimina parámetros de seguimiento para conservar un enlace de referencia limpio.
  return { url: url.origin + url.pathname, id: 'MLC' + match[1] };
}
