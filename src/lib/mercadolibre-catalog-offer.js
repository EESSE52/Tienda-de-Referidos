import { fetchMercadoLibreItem } from './mercadolibre.js';

/**
 * Una ficha /p/ identifica el producto del catálogo, no un vendedor.
 * Solo importamos si Mercado Libre proporciona explícitamente un ítem ganador.
 */
export async function fetchChileCatalogOffer(source, fetchImplementation = fetch, fetchItem = fetchMercadoLibreItem) {
  if (source?.kind !== 'catalog' || !/^MLC[0-9]{6,}$/.test(source.id)) {
    throw new Error('La ficha de catálogo no es válida.');
  }
  let response;
  try {
    response = await fetchImplementation('https://api.mercadolibre.com/products/' + source.id, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error('No se pudo consultar la ficha de catálogo de Mercado Libre.');
  }
  if (!response.ok) {
    throw new Error('Mercado Libre no permitió consultar la ficha de catálogo (' + response.status + '). Puede requerir autorización API.');
  }
  const product = await response.json();
  const candidate = product?.buy_box_winner?.item_id || product?.buy_box_winner?.id;
  if (!/^MLC[0-9]{6,}$/.test(String(candidate || ''))) {
    throw new Error('Esta ficha de catálogo no entrega una publicación de vendedor con precio verificable. Abre la oferta específica del vendedor y copia su enlace.');
  }
  const item = await fetchItem(candidate);
  return { ...item, id_publicacion: candidate, url_publicacion: source.url, id_catalogo: source.id, afiliado_verificado: false };
}
