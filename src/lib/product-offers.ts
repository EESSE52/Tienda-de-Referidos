import type { Producto } from './catalog';

/** Agrupa solo publicaciones vinculadas explícitamente al MISMO producto.
 * No usar coincidencias de texto: un tamaño o sabor diferente no es equivalente.
 */
export function getOfferGroupId(product: Pick<Producto, 'grupo_ofertas' | 'id_catalogo'>): string | null {
  const group = String(product.grupo_ofertas ?? '').trim();
  if (group) return 'manual:' + group.toLowerCase();
  const catalogId = String(product.id_catalogo ?? '').trim();
  return catalogId ? 'catalog:' + catalogId.toUpperCase() : null;
}

export function getOffersForProduct(product: Producto, allProducts: Producto[]): Producto[] {
  if (!product.activo || product.es_prueba === true) return [];
  const group = getOfferGroupId(product);
  return allProducts.filter(candidate => {
    if (!candidate.activo || candidate.es_prueba === true || candidate.lista_id !== product.lista_id) return false;
    if (candidate.id === product.id) return true;
    return group !== null && getOfferGroupId(candidate) === group;
  }).sort((a, b) => {
    const priceA = Number.isFinite(Number(a.precio)) && Number(a.precio) > 0 ? Number(a.precio) : Infinity;
    const priceB = Number.isFinite(Number(b.precio)) && Number(b.precio) > 0 ? Number(b.precio) : Infinity;
    return priceA - priceB || String(a.id).localeCompare(String(b.id));
  });
}

export function getOfferSeller(product: Producto): string {
  return String(product.vendedor_nombre || product.vendedor || 'Vendedor no indicado').trim();
}

export function getOfferSavings(offers: Producto[]): number | null {
  if (offers.length < 2) return null;
  const prices = offers.map(offer => Number(offer.precio)).filter(price => Number.isFinite(price) && price > 0);
  return prices.length >= 2 ? Math.max(...prices) - Math.min(...prices) : null;
}

/** Una ficha por producto físico en las listas; la ficha muestra sus vendedores. */
export function getGroupedListingProducts(products: Producto[]): Producto[] {
  const groups = new Map<string, Producto[]>();
  for (const product of products) {
    if (!product.activo || product.es_prueba === true) continue;
    const key = getOfferGroupId(product);
    const identity = key ? product.lista_id + ':' + key : product.lista_id + ':single:' + product.id;
    const group = groups.get(identity) ?? [];
    group.push(product);
    groups.set(identity, group);
  }
  return [...groups.values()].map(group => group.sort((a, b) =>
    Number(a.precio) - Number(b.precio) || String(a.id).localeCompare(String(b.id))
  )[0]);
}
