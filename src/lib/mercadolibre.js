import { extractAffiliateProductData } from './link-extractor.js';

function normalizeNumber(value) {
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) return null;
  const number = Number(raw.replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function findAttribute(attributes, ids) {
  return attributes.find(attribute => ids.includes(String(attribute?.id || '').toUpperCase())) || null;
}

function attributeText(attributes, ids) {
  const attribute = findAttribute(attributes, ids);
  return String(attribute?.value_name ?? attribute?.value ?? '').trim();
}

function attributePositiveNumber(attributes, ids) {
  const attribute = findAttribute(attributes, ids);
  if (!attribute) return null;
  const structured = attribute.value_struct?.number;
  if (structured !== undefined && structured !== null) {
    const number = Number(structured);
    return Number.isFinite(number) && number > 0 ? number : null;
  }
  return normalizeNumber(attributeText(attributes, ids));
}

function weightToGrams(value) {
  const match = String(value || '').match(/^\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos?)\s*$/i);
  if (!match) return null;
  const amount = normalizeNumber(match[1]);
  return amount === null ? null : /^kg$/i.test(match[2]) ? amount * 1000 : amount;
}

function attributeWeightGrams(attributes, ids) {
  const attribute = findAttribute(attributes, ids);
  if (!attribute) return null;
  const structured = attribute.value_struct;
  if (structured && structured.number != null && structured.unit) {
    return weightToGrams(String(structured.number) + ' ' + structured.unit);
  }
  return weightToGrams(attributeText(attributes, ids));
}

function supplementFormat(attributes) {
  const raw = attributeText(attributes, ['SUPPLEMENT_FORMAT', 'PRODUCT_FORMAT', 'FORMAT']);
  const clean = raw.toLocaleLowerCase('es');
  if (['polvo', 'en polvo', 'powder'].includes(clean)) return 'Polvo';
  if (['capsulas', 'cápsulas', 'capsules'].includes(clean)) return 'Capsulas';
  if (['tabletas', 'tablets', 'comprimidos'].includes(clean)) return 'Tabletas';
  return '';
}

export function getMercadoLibreItemId(value) {
  const decoded = decodeURIComponent(String(value || ''));
  const match = decoded.match(/\b(ML[A-Z])[-_]?(\d{6,})\b/i);
  return match ? `${match[1]}${match[2]}`.toUpperCase() : '';
}

export function mapMercadoLibreItem(item = {}) {
  const attributes = Array.isArray(item.attributes) ? item.attributes : [];
  const gramosTotal = attributeWeightGrams(attributes, ['NET_WEIGHT', 'WEIGHT']);
  const productAttributes = {};

  if (gramosTotal !== null) productAttributes.gramos_total = gramosTotal;

  const flavor = attributeText(attributes, ['FLAVOR']);
  if (flavor) productAttributes.sabor = flavor;

  const porciones = attributePositiveNumber(attributes, ['SERVINGS_NUMBER', 'NUMBER_OF_SERVINGS']);
  if (porciones !== null) productAttributes.porciones = porciones;

  const formato = supplementFormat(attributes);
  if (formato) productAttributes.formato = formato;

  // No inferimos porciones de gramos ni dosis desde el título: necesitan dato verificable.
  // Solo calculamos dosis estándar cuando existe peso neto explícito en atributos.
  if (gramosTotal !== null) {
    productAttributes.dosis_3g = Math.floor(gramosTotal / 3);
    productAttributes.dosis_5g = Math.floor(gramosTotal / 5);
  }

  return {
    name: String(item.title || '').trim(),
    brand: attributeText(attributes, ['BRAND']),
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

export async function fetchMercadoLibreItem(itemId, fetchImplementation = fetch, accessToken = '') {
  const normalizedId = getMercadoLibreItemId(itemId);
  if (!normalizedId) {
    throw new Error('El enlace no contiene un ID de publicación válido de Mercado Libre.');
  }

  let response;
  try {
    response = await fetchImplementation(`https://api.mercadolibre.com/items/${normalizedId}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es-CL,es;q=0.9',
        'User-Agent': 'TiendaDeReferidos/1.0 (+https://github.com/EESSE52/Tienda-de-Referidos)',
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
      },
    });
  } catch {
    throw new Error('No fue posible conectar con la API de Mercado Libre para la publicación ' + normalizedId + '. Comprueba el acceso al proveedor o ingresa el producto manualmente con datos verificados.');
  }

  if (!response.ok) {
    let errorPayload = {};
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = {};
    }

    // Con OAuth activo no recurrir al scraping como respuesta a un 401/403:
    // es importante mostrar el bloqueo real del proveedor, sin ocultarlo.
    if (!accessToken) {
      const fallback = await fallbackMercadoLibrePage(normalizedId, fetchImplementation);
      if (fallback) return fallback;
    }

    if (response.status === 401) {
      throw new Error('Mercado Libre respondió 401: el token API está ausente, expirado o no es válido. Reautoriza la aplicación oficial y verifica sus credenciales.');
    }
    if (response.status === 429) {
      throw new Error('Mercado Libre respondió 429: límite de solicitudes. Reduce las consultas y vuelve a intentar más tarde.');
    }
    if (response.status === 403 && !accessToken) {
      throw new Error('Mercado Libre rechazó esta consulta a su API (403 sin token API). Configura ML_ACCESS_TOKEN con una autorización oficial y los permisos adecuados para acceder a publicaciones.');
    }
    if (response.status === 403 && accessToken) {
      throw new Error('Mercado Libre respondió 403 con token API. Revisa los permisos funcionales de la aplicación y la autorización del usuario; Mercado Libre podría restringir este recurso.');
    }
    if (errorPayload.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
      throw new Error('Mercado Libre rechazó esta consulta a su API (restricción de acceso). No se puede obtener un precio automático en este momento; usa el ingreso manual supervisado del administrador o configura acceso oficial autorizado.');
    }

    throw new Error(`Mercado Libre no pudo entregar la publicación (${response.status}).`);
  }

  let item;
  try {
    item = await response.json();
  } catch {
    throw new Error('Mercado Libre respondió sin datos JSON válidos para la publicación ' + normalizedId + '. Puedes registrar los datos manualmente tras verificarlos.');
  }
  if (!Number.isSafeInteger(Number(item?.price)) || Number(item?.price) <= 0 || item?.currency_id && item.currency_id !== 'CLP') {
    throw new Error('La API de Mercado Libre no entregó un precio válido en pesos chilenos para esta publicación. Comprueba que sea una publicación real, vigente y con precio visible. No se modificó el precio guardado.');
  }
  return mapMercadoLibreItem(item);
}
