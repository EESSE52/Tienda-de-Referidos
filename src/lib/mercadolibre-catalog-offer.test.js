import { describe, expect, it, vi } from 'vitest';
import { fetchChileCatalogOffer } from './mercadolibre-catalog-offer.js';

const source = {
  kind: 'catalog',
  id: 'MLC987654321',
  url: 'https://www.mercadolibre.cl/producto/p/MLC987654321',
};

describe('ofertas de fichas de catálogo', () => {
  it('consulta el item de vendedor y conserva su enlace al catálogo', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ buy_box_winner: { item_id: 'MLC1234567890' } }),
    });
    const fetchItem = vi.fn().mockResolvedValue({ name: 'Creatina real', price: 20000 });
    const result = await fetchChileCatalogOffer(source, fetchImplementation, fetchItem);
    expect(result).toMatchObject({
      name: 'Creatina real', price: 20000,
      id_publicacion: 'MLC1234567890',
      id_catalogo: 'MLC987654321',
      afiliado_verificado: false,
    });
    expect(fetchItem).toHaveBeenCalledWith('MLC1234567890');
  });
  it('no inventa ítem o precio si la ficha no presenta oferta explícita', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ name: 'Creatina', buy_box_winner: null }),
    });
    const fetchItem = vi.fn();
    await expect(fetchChileCatalogOffer(source, fetchImplementation, fetchItem))
      .rejects.toThrow('publicación de vendedor');
    expect(fetchItem).not.toHaveBeenCalled();
  });
  it('informa cuando API requiere autorización y nunca consulta otro host', async () => {
    await expect(fetchChileCatalogOffer(source,
      vi.fn().mockResolvedValue({ ok: false, status: 403 }))).rejects.toThrow('autorización');
  });
});
