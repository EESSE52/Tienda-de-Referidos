import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cloudflare-catalog.js', () => ({
  readCatalog: vi.fn(),
  saveRecord: vi.fn(),
}));

import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { createAdminProduct, updateAdminProduct, deactivateAdminProduct, getAdminProduct } from './admin-products.js';

const existing = {
  id: 'real-1',
  lista_id: 'creatina',
  nombre: 'Producto registrado',
  marca: 'Marca',
  precio: 10000,
  enlace_referido: 'https://www.mercadolibre.cl/item/1',
  url_publicacion: 'https://www.mercadolibre.cl/item/1',
  activo: true,
  atributos: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCatalog).mockResolvedValue({
    listas: [{ id: 'creatina', slug: 'creatina' }],
    productos: [{ ...existing }],
  });
  vi.mocked(saveRecord).mockResolvedValue(undefined);
});

describe('API de administración: lógica de productos D1', () => {
  it('crea un producto y lo guarda en la tabla de compatibilidad', async () => {
    const product = await createAdminProduct({}, {
      id: 'nuevo-1',
      lista_id: 'creatina',
      nombre: 'Producto nuevo',
      precio: 15000,
      enlace_referido: 'https://www.mercadolibre.cl/item/2',
    });
    expect(product.id).toBe('nuevo-1');
    expect(saveRecord).toHaveBeenCalledWith({}, 'catalog_products', expect.objectContaining({ id: 'nuevo-1' }));
  });

  it('rechaza categorías inexistentes', async () => {
    await expect(createAdminProduct({}, {
      lista_id: 'inexistente',
      nombre: 'Prueba',
      precio: 1000,
      enlace_referido: 'https://example.com/x',
    })).rejects.toThrow('categoría');
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('explica errores de precio y enlace como 400 en vez de error interno 500', async () => {
    const { adminProductErrorResponse } = await import('./admin-products.js');
    for (const input of [
      { lista_id: 'creatina', nombre: 'Dymatize ISO100 600g', precio: 0, activo: false, url_publicacion:'https://www.mercadolibre.cl/p/MLC18561166' },
      { lista_id: 'creatina', nombre: 'Dymatize ISO100 600g', precio: 60000, activo: true, url_publicacion:'https://www.mercadolibre.cl/p/MLC18561166' },
    ]) {
      let failure;
      try { await createAdminProduct({}, input); } catch (error) { failure = error; }
      expect(failure).toMatchObject({status: 400});
      const output = adminProductErrorResponse(failure, (body, status) => ({body,status}));
      expect(output.status).toBe(400);
      expect(output.body.error).not.toBe('Error interno al procesar el producto.');
    }
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('no expone detalles internos cuando falla D1', async () => {
    const { adminProductErrorResponse } = await import('./admin-products.js');
    vi.mocked(saveRecord).mockRejectedValueOnce(new Error('SQLITE_ERROR: detalles privados'));
    let failure;
    try {
      await createAdminProduct({}, {
        id:'nuevo-error-d1', lista_id:'creatina', nombre:'Producto',
        precio:10000, activo:false, url_publicacion:'https://www.mercadolibre.cl/p/MLC18561166',
      });
    } catch (error) { failure=error; }
    expect(failure).toBeInstanceOf(Error);
    const response=adminProductErrorResponse(failure, (body,status)=>({body,status}));
    expect(response.status).toBe(500);
    expect(response.body.error).not.toContain('SQLITE_ERROR');
  });

  it('rechaza duplicados', async () => {
    await expect(createAdminProduct({}, { ...existing, id: 'otro-id' })).rejects.toThrow('duplicado');
  });

  it('edita un producto existente sin cambiar su ID', async () => {
    const updated = await updateAdminProduct({}, 'real-1', { precio: 12990 });
    expect(updated.precio).toBe(12990);
    expect(saveRecord).toHaveBeenCalledOnce();
    await expect(updateAdminProduct({}, 'real-1', { id: 'otro-id' })).rejects.toThrow('identificador');
  });

  it('conserva bandera de prueba entre ediciones', async () => {
    const result = await updateAdminProduct({}, 'real-1', { es_prueba: true });
    expect(result.es_prueba).toBe(true);
    expect(saveRecord).toHaveBeenCalledWith({}, 'catalog_products', expect.objectContaining({ es_prueba: true }));
  });

  it('desactiva sin eliminar el registro', async () => {
    const product = await deactivateAdminProduct({}, 'real-1');
    expect(product.activo).toBe(false);
    expect(saveRecord).toHaveBeenCalledWith({}, 'catalog_products', expect.objectContaining({ id: 'real-1', activo: false }));
  });

  it('consulta productos y rechaza los inexistentes', async () => {
    expect((await getAdminProduct({}, 'real-1')).nombre).toBe('Producto registrado');
    await expect(getAdminProduct({}, 'no-existe')).rejects.toMatchObject({ status: 404 });
  });
});
