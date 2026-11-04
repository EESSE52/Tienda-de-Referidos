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

  it('envía token oficial de servidor por Authorization sin alterar otros encabezados', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ title: 'Creatina', price: 12000, currency_id: 'CLP' }) });
    await fetchMercadoLibreItem('MLC1234567890', request, 'APP_USR-token-validado');
    expect(request.mock.calls[0][1].headers.Authorization).toBe('Bearer APP_USR-token-validado');
  });
  it('diferencia token vencido de permisos insuficientes', async () => {
    const blocked = status => vi.fn()
      .mockResolvedValueOnce({ ok: false, status, json: async () => ({ code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' }) })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(fetchMercadoLibreItem('MLC1234567890', blocked(401), 'token')).rejects.toThrow('401');
    await expect(fetchMercadoLibreItem('MLC1234567890', blocked(403), 'token')).rejects.toThrow('permisos');
  });

  it('no intenta obtener HTML alternativo si el proveedor deniega el acceso con OAuth', async () => {
    const request = vi.fn().mockResolvedValue({ ok: false, status: 403,
      json: async () => ({ code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' }) });
    await expect(fetchMercadoLibreItem('MLC1234567890', request, 'APP_USR-test'))
      .rejects.toThrow('403');
    expect(request).toHaveBeenCalledTimes(1);
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

  it('rechaza respuestas API sin precio o con moneda distinta de CLP', async () => {
    for (const item of [
      { title: 'Sin precio', price: null },
      { title: 'Precio cero', price: 0 },
      { title: 'Moneda extranjera', price: 19990, currency_id: 'ARS' },
    ]) {
      const request = vi.fn().mockResolvedValue({ ok: true, json: async () => item });
      await expect(fetchMercadoLibreItem('MLC1234567890', request)).rejects.toThrow('precio');
    }
  });

  it('no acepta precio vacío de páginas de respaldo', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' }) })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><head><meta property="og:title" content="Producto sin precio" /></head></html>',
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(fetchMercadoLibreItem('MLC1234567890', request)).rejects.toThrow('Mercado Libre rechazó esta consulta a su API');
  });

  it('explains when the environment blocks Mercado Libre access', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' }),
    });

    await expect(fetchMercadoLibreItem('MLC-1234567890', fetchImplementation))
      .rejects
      .toThrow('Mercado Libre rechazó esta consulta a su API');
  });
});
