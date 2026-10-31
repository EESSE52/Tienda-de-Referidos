import { describe, expect, it, vi } from 'vitest';
import { fetchMercadoLibreItem, getMercadoLibreItemId, mapMercadoLibreItem } from './mercadolibre.js';

describe('Mercado Libre item lookup', () => {
  it('normalizes publication IDs from URLs with and without a separator', () => {
    expect(getMercadoLibreItemId('https://articulo.mercadolibre.cl/MLC-1234567890')).toBe('MLC1234567890');
    expect(getMercadoLibreItemId('https://articulo.mercadolibre.cl/MLC1234567890')).toBe('MLC1234567890');
  });

  it('maps public item API data to the product form fields', () => {
    expect(mapMercadoLibreItem({
      title: 'Creatina monohidratada',
      price: 19990,
      seller: { nickname: 'Tienda Oficial' },
      pictures: [{ secure_url: 'https://example.com/product.jpg' }],
      attributes: [
        { id: 'BRAND', value_name: 'Marca X' },
        { id: 'NET_WEIGHT', value_name: '0,3 kg' },
        { id: 'FLAVOR', value_name: 'Sin sabor' },
      ],
    })).toEqual({
      name: 'Creatina monohidratada',
      brand: 'Marca X',
      seller: 'Tienda Oficial',
      price: 19990,
      image: 'https://example.com/product.jpg',
      attributes: { gramos_total: 300, sabor: 'Sin sabor' },
    });
  });

  it('requests the official public item endpoint', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Producto', price: 1000 }),
    });

    await fetchMercadoLibreItem('MLC-1234567890', fetchImplementation);

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://api.mercadolibre.com/items/MLC1234567890',
      {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'es-CL,es;q=0.9',
          'User-Agent': 'TiendaDeReferidos/1.0 (+https://github.com/EESSE52/Tienda-de-Referidos)',
        },
      },
    );
  });

  it('falls back to the public product page when the API is blocked', async () => {
    const fetchImplementation = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html>
            <head>
              <meta property="og:title" content="Proteína Whey Isolate 900 g" />
              <meta property="og:brand" content="Nutribox" />
              <meta property="og:image" content="https://example.com/product.jpg" />
              <meta property="product:price:amount" content="32990" />
              <meta name="author" content="Nutribox Shop" />
            </head>
          </html>
        `,
      });

    await expect(fetchMercadoLibreItem('MLC-1234567890', fetchImplementation))
      .resolves
      .toMatchObject({
        name: 'Proteína Whey Isolate 900 g',
        brand: 'Nutribox',
        seller: 'Nutribox Shop',
        price: 32990,
        image: 'https://example.com/product.jpg',
      });
  });

  it('explains when the environment blocks Mercado Libre access', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' }),
    });

    await expect(fetchMercadoLibreItem('MLC-1234567890', fetchImplementation))
      .rejects
      .toThrow('Este entorno bloquea las consultas a la API de Mercado Libre.');
  });
});
