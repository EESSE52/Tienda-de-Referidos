import { describe, expect, it } from 'vitest';
import { extractMercadoLibreIds } from './mercadolibre.js';

describe('extractMercadoLibreIds', () => {
  it('prioritizes the affiliate publication id in wid and keeps the catalog id', () => {
    const url = 'https://www.mercadolibre.cl/creatina/p/MLC35176477?pdp_filters=deal%3A1#polycard_client=affiliates&wid=MLC2726337734&sid=affiliates';
    expect(extractMercadoLibreIds(url)).toEqual({
      itemId: 'MLC2726337734',
      productId: 'MLC35176477',
    });
  });

  it('reads publication id from wid query parameters', () => {
    expect(extractMercadoLibreIds('https://www.mercadolibre.cl/item?wid=MLC2726337734')).toEqual({
      itemId: 'MLC2726337734',
      productId: '',
    });
  });

  it('does not mistake a catalog product id for an item id', () => {
    expect(extractMercadoLibreIds('https://www.mercadolibre.cl/p/MLC35176477')).toEqual({
      itemId: '',
      productId: 'MLC35176477',
    });
  });
});
