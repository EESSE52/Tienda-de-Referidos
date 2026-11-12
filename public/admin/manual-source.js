/** Preparación local de formulario manual: no consulta API ni altera enlaces afiliados. */
export function identifyManualSource(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048) throw new Error('Pega un enlace HTTPS de Mercado Libre Chile.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Enlace inválido.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('El enlace debe ser HTTPS sin credenciales.');
  const host = url.hostname.toLowerCase();
  if (host === 'meli.la') {
    if (!/^\/[a-zA-Z0-9]{5,32}\/?$/.test(url.pathname)) throw new Error('Enlace corto meli.la inválido.');
    return { url: raw, id_publicacion: '', id_catalogo: '', short: true };
  }
  if (!['mercadolibre.cl','www.mercadolibre.cl','articulo.mercadolibre.cl'].includes(host)) {
    throw new Error('Solo se admiten enlaces oficiales de Mercado Libre Chile.');
  }
  const path = url.pathname;
  const catalog = path.match(/\/p\/(MLC\d{6,})(?=\/|$)/i)?.[1]?.toUpperCase() || '';
  const userProduct = /\/up\/MLCU\d{6,}(?:\/|$)/i.test(path);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const wid = fragment.get('wid') || url.searchParams.get('wid') || '';
  const offer = /^MLC\d{6,}$/i.test(wid) ? wid.toUpperCase() : '';
  const item = path.match(/(?:^|[^a-z0-9])MLC[-_]?(\d{6,})(?=[^0-9]|$)/i);
  const queryItem = ['item_id','itemId','item_id_for','item'].map(k=>url.searchParams.get(k)||'').find(v=>/^MLC\d{6,}$/i.test(v));
  const id = offer || (!catalog && !userProduct && item ? 'MLC'+item[1] : '') || (!catalog && !userProduct && queryItem ? queryItem.toUpperCase() : '');
  return { url: raw, id_publicacion:id, id_catalogo:catalog, short:false };
}
