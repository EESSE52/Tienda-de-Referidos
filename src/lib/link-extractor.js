function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizePrice(rawValue) {
  const text = String(rawValue ?? '').trim();
  if (!text || text === '—' || text === 'null') return null;

  const compact = text.replace(/[$\s]/g, '').replace(/\u00a0/g, '');
  if (!compact) return null;

  const withComma = compact.replace(/\./g, '').replace(',', '.');
  const numeric = Number(withComma);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeUrl(baseUrl, value) {
  if (!value) return '';
  try {
    return new URL(value, baseUrl || undefined).href;
  } catch (error) {
    return value;
  }
}

function collectMetaValues(html) {
  const map = new Map();
  const metaRegex = /<meta[^>]+(?:name|property)=['"]([^'"]+)['"][^>]*content=['"]([^'"]*)['"][^>]*>/gi;
  const metaRegexAlt = /<meta[^>]+content=['"]([^'"]*)['"][^>]*(?:name|property)=['"]([^'"]+)['"][^>]*>/gi;

  for (const regex of [metaRegex, metaRegexAlt]) {
    let match;
    while ((match = regex.exec(html))) {
      const key = decodeHtmlEntities((match[1] || match[2] || '').trim()).toLowerCase();
      const value = decodeHtmlEntities((match[2] || match[1] || '').trim());
      if (key && value) {
        map.set(key, value);
      }
    }
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const title = decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ').trim());
    if (title) {
      map.set('title', title);
    }
  }

  return map;
}

function coerceArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function unwrapJsonLdValue(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const unwrapped = unwrapJsonLdValue(item);
      if (unwrapped) return unwrapped;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    if (value.url || value.name || value.brand || value.image || value.offers) {
      return value;
    }

    for (const nested of Object.values(value)) {
      const unwrapped = unwrapJsonLdValue(nested);
      if (unwrapped) return unwrapped;
    }
  }

  return null;
}

function extractFromJsonLd(html) {
  const matches = [...html.matchAll(/<script[^>]*type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of matches) {
    const raw = match[1];
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const productNode = unwrapJsonLdValue(parsed);
      if (!productNode) continue;

      return {
        name: productNode.name || productNode.headline || '',
        brand: typeof productNode.brand === 'string' ? productNode.brand : (productNode.brand && productNode.brand.name) || '',
        seller: typeof productNode.seller === 'string' ? productNode.seller : (productNode.seller && productNode.seller.name) || '',
        price: productNode.offers && typeof productNode.offers === 'object'
          ? productNode.offers.price || productNode.offers.lowPrice || productNode.offers.highPrice || ''
          : productNode.price || '',
        image: Array.isArray(productNode.image)
          ? productNode.image[0]
          : (typeof productNode.image === 'string' ? productNode.image : (productNode.image && productNode.image.url) || ''),
      };
    } catch (error) {
      // Ignorar JSON-LD no válido.
    }
  }

  return null;
}

export function extractAffiliateProductData(html, sourceUrl = '') {
  const cleanHtml = String(html || '');
  const meta = collectMetaValues(cleanHtml);
  const jsonLd = extractFromJsonLd(cleanHtml);

  const imageFromMeta = [
    meta.get('og:image'),
    meta.get('twitter:image'),
    meta.get('image'),
    meta.get('product:image'),
    meta.get('thumbnail_url'),
    jsonLd?.image,
  ].find(Boolean) || '';

  const nameFromMeta = [
    meta.get('og:title'),
    meta.get('twitter:title'),
    meta.get('product:name'),
    meta.get('title'),
    jsonLd?.name,
  ].find(Boolean) || '';

  const brandFromMeta = [
    meta.get('og:brand'),
    meta.get('product:brand'),
    meta.get('brand'),
    typeof jsonLd?.brand === 'string' ? jsonLd.brand : '',
  ].find(Boolean) || '';

  const sellerFromMeta = [
    meta.get('seller'),
    meta.get('author'),
    meta.get('og:seller_name'),
    meta.get('product:seller'),
    jsonLd?.seller,
  ].find(Boolean) || '';

  const priceFromMeta = [
    meta.get('product:price:amount'),
    meta.get('og:price:amount'),
    meta.get('price'),
    meta.get('data-price'),
    jsonLd?.price,
  ].find(Boolean) || '';

  const rawPrice = normalizePrice(priceFromMeta);
  const cleanedImage = normalizeUrl(sourceUrl, imageFromMeta);

  return {
    name: decodeHtmlEntities((nameFromMeta || '').replace(/\s+/g, ' ').trim()) || 'Producto',
    brand: decodeHtmlEntities((brandFromMeta || '').replace(/\s+/g, ' ').trim()) || 'Sin marca',
    seller: decodeHtmlEntities((sellerFromMeta || '').replace(/\s+/g, ' ').trim()) || 'Sin vendedor',
    price: rawPrice !== null ? Number(rawPrice) : 0,
    image: cleanedImage,
  };
}
