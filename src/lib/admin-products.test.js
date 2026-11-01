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

  it('rechaza duplicados', async () => {
    await expect(createAdminProduct({}, { ...existing, id: 'otro-id' })).rejects.toThrow('duplicado');
  });

  it('edita un producto existente sin cambiar su ID', async () => {
    const updated = await updateAdminProduct({}, 'real-1', { precio: 12990 });
    expect(updated.precio).toBe(12990);
    expect(saveRecord).toHaveBeenCalledOnce();
    await expect(updateAdminProduct({}, 'real-1', { id: 'otro-id' })).rejects.toThrow('identificador');
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
