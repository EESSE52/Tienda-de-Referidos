import { describe, expect, it } from 'vitest';
import { buildManualProductPayload } from './mercadolibre-payload.js';

describe('manual product payload builder', () => {
  it('creates a product payload ready to paste into the admin form', () => {
    const payload = buildManualProductPayload(
      {
        name: 'Creatina monohidratada',
        brand: 'Nutrición Plus',
        seller: 'Tienda Oficial',
        price: 19990,
        image: 'https://example.com/creatina.jpg',
        attributes: { gramos_total: 300, sabor: 'Sin sabor' },
      },
      {
        url: 'https://www.mercadolibre.cl/creatina-monohidratada/MLC1234567890',
        lista_id: 'creatina',
      },
    );

    expect(payload).toMatchObject({
      lista_id: 'creatina',
      nombre: 'Creatina monohidratada',
      marca: 'Nutrición Plus',
      precio: 19990,
      id_publicacion: 'MLC1234567890',
      enlace_referido: 'https://www.mercadolibre.cl/creatina-monohidratada/MLC1234567890',
      url_publicacion: 'https://www.mercadolibre.cl/creatina-monohidratada/MLC1234567890',
      imagen: 'https://example.com/creatina.jpg',
      vendedor: 'Tienda Oficial',
      activo: true,
      atributos: { gramos_total: 300, sabor: 'Sin sabor' },
    });
    expect(payload.id).toContain('producto-');
  });
});
