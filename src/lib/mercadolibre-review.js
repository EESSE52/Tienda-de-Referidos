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
  // Las fichas /up/MLCU suelen incluir el ID de la oferta en #wid=MLC...
  // El fragmento solo se usa como dato: nunca es una dirección a consultar.
  const userProduct = url.pathname.match(/\/up\/(MLCU[0-9]{6,})(?=\/|$)/i);
  if (userProduct) {
    const fragment = new URLSearchParams(url.hash.slice(1));
    const offered = fragment.get('wid') || url.searchParams.get('wid') || '';
    if (/^MLC[0-9]{6,}$/i.test(offered)) {
      return { url: url.href, id: offered.toUpperCase(), kind: 'item' };
    }
    throw new Error('La ficha User Product (' + userProduct[1].toUpperCase() + ') no incluye una oferta de vendedor wid=MLC válida. Abre una oferta concreta para copiar su enlace.');
  }
  const catalog = url.pathname.match(/\/p\/(MLC[0-9]{6,})(?=\/|$)/i);
  if (catalog) {
    // En fichas /p/, wid=MLC... identifica una oferta real de vendedor.
    // Es prioritario frente al ID del catálogo y evita depender de buy_box_winner.
    const fragment = new URLSearchParams(url.hash.slice(1));
    const offered = fragment.get('wid') || url.searchParams.get('wid') || '';
    if (/^MLC[0-9]{6,}$/i.test(offered)) {
      return { url: url.href, id: offered.toUpperCase(), kind: 'item', catalogId: catalog[1].toUpperCase() };
    }
    return { url: url.origin + url.pathname, id: catalog[1].toUpperCase(), kind: 'catalog' };
  }
  const values = [url.pathname, ...['item_id', 'itemId', 'item_id_for', 'item'].map(key => url.searchParams.get(key) || '')];
  const match = values.map(text => text.match(/(?:^|[^a-z0-9])MLC[-_]?([0-9]{6,})(?=[^0-9]|$)/i)).find(Boolean);
  if (!match) {
    const userProduct = url.pathname.match(/\/up\/(MLCU[0-9]{6,})(?=\/|$)/i);
    if (userProduct) throw new Error('El enlace abre un User Product (' + userProduct[1].toUpperCase() + '), no una publicación de vendedor. Abre una oferta concreta y copia el enlace que contenga MLC seguido de números.');
    const destination = url.origin + url.pathname;
    throw new Error('El enlace corto conduce a ' + destination.slice(0, 240) + ', pero no incluye un ID MLC de publicación o catálogo. Abre esa dirección en el navegador y copia el enlace de una oferta concreta.');
  }
  return { url: url.origin + url.pathname, id: 'MLC' + match[1], kind: 'item' };
}


/**
 * Resuelve enlaces cortos oficiales sin permitir redirecciones a destinos arbitrarios.
 * Cada salto se inspecciona antes de efectuar una nueva petición (redirect: manual).
 */
export async function resolveChileMercadoLibreUrl(value, fetchImplementation = fetch) {
  const raw = String(value ?? '').trim();
  if (raw.length > 2048) throw new Error('El enlace es demasiado largo.');
  let start;
  try { start = new URL(raw); } catch { throw new Error('Introduce una URL HTTPS válida.'); }
  if (start.protocol !== 'https:' || start.username || start.password || start.port) {
    throw new Error('Solo se aceptan enlaces HTTPS sin credenciales.');
  }
  if (start.hostname.toLowerCase() !== 'meli.la') return normalizeChileMercadoLibreUrl(raw);
  if (!/^\/[a-zA-Z0-9]{5,32}\/?$/.test(start.pathname)) {
    throw new Error('El enlace corto meli.la no tiene un formato válido.');
  }
  let current = start.origin + start.pathname;
  const allowed = new Set(['meli.la', 'mercadolibre.cl', 'www.mercadolibre.cl', 'articulo.mercadolibre.cl']);
  for (let i = 0; i < 5; i++) {
    let response;
    try {
      response = await fetchImplementation(current, { method: 'GET', redirect: 'manual', headers: { Accept: 'text/html' } });
    } catch {
      throw new Error('No fue posible resolver el enlace corto meli.la desde el servidor.');
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.get('location');
      if (!location) throw new Error('El enlace corto no entregó un destino.');
      const next = new URL(location, current);
      if (next.protocol !== 'https:' || next.username || next.password || next.port || !allowed.has(next.hostname.toLowerCase())) {
        throw new Error('El enlace corto redirige fuera de Mercado Libre Chile.');
      }
      if (next.hostname.toLowerCase() !== 'meli.la') return normalizeChileMercadoLibreUrl(next.href);
      current = next.origin + next.pathname;
      continue;
    }
    // Un bloqueo/captcha o página HTML no prueba a qué producto corresponde.
    throw new Error('Mercado Libre no permitió resolver este enlace corto. Abre el enlace en tu navegador y copia la URL completa de la publicación.');
  }
  throw new Error('El enlace corto contiene demasiadas redirecciones.');
}
