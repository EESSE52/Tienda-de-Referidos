const ALLOWED_HOSTS = new Set([
  'meli.la',
  'www.meli.la',
  'mercadolibre.cl',
  'www.mercadolibre.cl',
  'mercadolibre.com',
  'www.mercadolibre.com',
  'mercadolibre.com.ar',
  'www.mercadolibre.com.ar',
  'mercadolibre.com.mx',
  'www.mercadolibre.com.mx',
]);

function assertAllowedUrl(value) {
  const url = value instanceof URL ? value : new URL(value);
  if (url.protocol !== 'https:') throw new Error('El enlace debe utilizar HTTPS.');
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('El enlace no pertenece a un dominio permitido de Mercado Libre.');
  }
  if (url.username || url.password) throw new Error('El enlace contiene credenciales no permitidas.');
  return url;
}

export function extractMercadoLibreIds(value) {
  const url = value instanceof URL ? value : new URL(value);
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  const candidates = [
    params.get('wid'),
    hashParams.get('wid'),
    params.get('item_id'),
    hashParams.get('item_id'),
  ];
  const itemId = candidates.find((id) => /^MLC\d{6,}$/i.test(String(id || ''))) || '';
  const productMatch = url.pathname.match(/\/p\/(MLC\d{6,})/i);
  const pathMatch = url.pathname.match(/\/(MLC\d{6,})(?:\/|$)/i);
  const productId = productMatch?.[1]?.toUpperCase() || '';
  const pathId = pathMatch?.[1]?.toUpperCase() || '';
  return {
    itemId: String(itemId || (!productId ? pathId : '')).toUpperCase(),
    productId: productId || '',
  };
}

export async function resolveMercadoLibreUrl(rawUrl) {
  let current = assertAllowedUrl(rawUrl);
  for (let hop = 0; hop < 6; hop += 1) {
    const response = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DMonkeySport/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.ok) throw new Error('Mercado Libre respondió HTTP ' + response.status + ' al resolver el enlace.');
      return current.href;
    }
    const location = response.headers.get('location');
    if (!location) throw new Error('La redirección no incluyó un destino.');
    current = assertAllowedUrl(new URL(location, current));
  }
  throw new Error('El enlace tiene demasiadas redirecciones.');
}

export async function fetchMercadoLibreItem(itemId) {
  if (!/^MLC\d{6,}$/i.test(String(itemId || ''))) {
    return { item: null, error: 'No se encontró un ID de publicación válido (MLC...).'};
  }
  const headers = { Accept: 'application/json' };
  if (process.env.MERCADOLIBRE_ACCESS_TOKEN) {
    headers.Authorization = 'Bearer ' + process.env.MERCADOLIBRE_ACCESS_TOKEN;
  }
  const response = await fetch('https://api.mercadolibre.com/items/' + encodeURIComponent(itemId), {
    headers,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.message || body.error || '';
    } catch {}
    return {
      item: null,
      error: 'API Mercado Libre HTTP ' + response.status + (detail ? ': ' + detail : '') +
        (response.status === 401 || response.status === 403
          ? '. Revisa la autorización OAuth y el token configurado en el servidor.'
          : ''),
    };
  }
  const item = await response.json();
  return { item, error: '' };
}
