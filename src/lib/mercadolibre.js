import { extractAffiliateProductData } from './link-extractor.js';

function normalizeNumber(value) {
  const text = String(value ?? '').trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function findAttribute(attributes, ids) {
  return attributes.find((attribute) => ids.includes(attribute?.id))?.value_name || '';
}

function weightToGrams(value) {
  const match = String(value || '').match(/([\d.,]+)\s*(kg|g|gr)\b/i);
  if (!match) return null;

  const amount = normalizeNumber(match[1]);
  if (amount === null) return null;
  return /^kg$/i.test(match[2]) ? amount * 1000 : amount;
}

export function getMercadoLibreItemId(value) {
  const decoded = decodeURIComponent(String(value || ''));
  const match = decoded.match(/\b(ML[A-Z])[-_]?(\d{6,})\b/i);
  return match ? `${match[1]}${match[2]}`.toUpperCase() : '';
}

export function mapMercadoLibreItem(item = {}) {
  const attributes = Array.isArray(item.attributes) ? item.attributes : [];
  const gramosTotal = weightToGrams(findAttribute(attributes, ['NET_WEIGHT', 'WEIGHT']));
  const productAttributes = {};

  if (gramosTotal !== null) productAttributes.gramos_total = gramosTotal;

  const flavor = findAttribute(attributes, ['FLAVOR']);
  if (flavor) productAttributes.sabor = flavor;

  return {
    name: String(item.title || '').trim(),
    brand: String(findAttribute(attributes, ['BRAND']) || '').trim(),
    seller: String(item.seller?.nickname || '').trim(),
    price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
    image: String(item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url || item.thumbnail || '').trim(),
    attributes: productAttributes,
  };
}

async function fallbackMercadoLibrePage(normalizedId, fetchImplementation = fetch) {
  const pageUrls = [
    `https://www.mercadolibre.cl/${normalizedId}`,
    `https://articulo.mercadolibre.cl/${normalizedId}`,
  ];

  for (const pageUrl of pageUrls) {
    try {
      const response = await fetchImplementation(pageUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; TiendaDeReferidosBot/1.0; +https://github.com/EESSE52/Tienda-de-Referidos)',
        },
      });

      if (!response?.ok) continue;

      const html = await response.text();
      const extracted = extractAffiliateProductData(html, pageUrl);
      if (!extracted || !extracted.name || extracted.name === 'Producto' || !Number.isSafeInteger(Number(extracted.price)) || Number(extracted.price) <= 0) continue;

      return {
        name: extracted.name,
        brand: extracted.brand,
        seller: extracted.seller,
        price: Number(extracted.price || 0),
        image: extracted.image,
        attributes: {},
      };
    } catch {
      // Continuar con la siguiente URL si la página no responde.
    }
  }

  return null;
}

export async function fetchMercadoLibreItem(itemId, fetchImplementation = fetch) {
  const normalizedId = getMercadoLibreItemId(itemId);
  if (!normalizedId) {
    throw new Error('El enlace no contiene un ID de publicación válido de Mercado Libre.');
  }

  const response = await fetchImplementation(`https://api.mercadolibre.com/items/${normalizedId}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es-CL,es;q=0.9',
      'User-Agent': 'TiendaDeReferidos/1.0 (+https://github.com/EESSE52/Tienda-de-Referidos)',
    },
  });

  if (!response.ok) {
    let errorPayload = {};
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = {};
    }

    const fallback = await fallbackMercadoLibrePage(normalizedId, fetchImplementation);
    if (fallback) {
      return fallback;
    }

    if (errorPayload.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
      throw new Error('Este entorno bloquea las consultas a la API de Mercado Libre. Usa una red o configuración que permita api.mercadolibre.com.');
    }

    throw new Error(`Mercado Libre no pudo entregar la publicación (${response.status}).`);
  }

  const item = await response.json();
  if (!Number.isSafeInteger(Number(item?.price)) || Number(item?.price) <= 0 || item?.currency_id && item.currency_id !== 'CLP') {
    throw new Error('La API de Mercado Libre no entregó un precio válido en pesos chilenos para esta publicación. Comprueba que sea una publicación real, vigente y con precio visible. No se modificó el precio guardado.');
  }
  return mapMercadoLibreItem(item);
}
