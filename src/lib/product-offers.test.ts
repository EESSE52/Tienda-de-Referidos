import { describe, expect, it } from 'vitest';
import { getOffersForProduct, getGroupedListingProducts, getOfferGroupId, getOfferSavings } from './product-offers';

const product = (id, price, extra = {}) => ({
  id, lista_id: 'creatina', nombre: 'Creatina Foodtech 1 kg', marca: 'Foodtech',
  id_publicacion: id, precio: price, activo: true, es_prueba: false,
  atributos: { gramos_total: 1000, porciones: 200 }, grupo_ofertas: 'foodtech-1kg-neutra', ...extra,
});

describe('ofertas de múltiples vendedores', () => {
  it('agrupa dos publicaciones del mismo producto y ordena por precio registrado', () => {
    const first = product('MLC1111111', 34990, { vendedor_nombre: 'Tienda A' });
    const second = product('MLC2222222', 29990, { vendedor_nombre: 'Tienda B' });
    const offers = getOffersForProduct(first, [first, second]);
    expect(offers.map(x => x.id)).toEqual(['MLC2222222', 'MLC1111111']);
    expect(getOfferSavings(offers)).toBe(5000);
    expect(getGroupedListingProducts([first, second]).map(x => x.id)).toEqual(['MLC2222222']);
  });
  it('no agrupa tamaños, sabores ni productos sin clave explícita', () => {
    const first = product('MLC1111111', 34990, { grupo_ofertas: '' });
    const second = product('MLC2222222', 29990, { grupo_ofertas: '' });
    expect(getOffersForProduct(first, [first, second])).toHaveLength(1);
    expect(getGroupedListingProducts([first, second])).toHaveLength(2);
  });
  it('acepta id_catalogo común como referencia explícita si no hay grupo manual', () => {
    const first = product('MLC1111111', 34990, { grupo_ofertas: '', id_catalogo: 'MLC12345678' });
    const second = product('MLC2222222', 32990, { grupo_ofertas: '', id_catalogo: 'mlc12345678' });
    expect(getOfferGroupId(first)).toBe('catalog:MLC12345678');
    expect(getOffersForProduct(first, [first, second])).toHaveLength(2);
  });
  it('excluye publicaciones inactivas, de prueba y de otras categorías', () => {
    const first = product('MLC1111111', 34990);
    const others = [first, product('MLC2222222', 29990, { activo: false }),
      product('MLC3333333', 19990, { es_prueba: true }),
      product('MLC4444444', 18990, { lista_id: 'proteina' })];
    expect(getOffersForProduct(first, others).map(x => x.id)).toEqual(['MLC1111111']);
    // La agrupación general conserva los productos válidos de otras categorías.
    // El filtrado por categoría ocurre antes de agrupar, en la página /lista/[slug].
    expect(getGroupedListingProducts(others).map(x => x.id)).toEqual(['MLC1111111', 'MLC4444444']);
    expect(getGroupedListingProducts(others.filter(x => x.lista_id === 'creatina'))
      .map(x => x.id)).toEqual(['MLC1111111']);
    expect(getOfferSavings(getOffersForProduct(first, others))).toBeNull();
  });
  it('no marca ahorro cuando hay un solo precio o no hay diferencia', () => {
    expect(getOfferSavings([product('MLC1111111', 34990)])).toBeNull();
    expect(getOfferSavings([product('MLC1111111', 34990), product('MLC2222222', 34990)])).toBe(0);
  });
});
