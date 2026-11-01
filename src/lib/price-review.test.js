import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./cloudflare-catalog.js', () => ({ readCatalog: vi.fn(), saveRecord: vi.fn() }));
import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { previewPriceChange, confirmPriceChange } from './price-review.js';

const product = {
  id: 'producto-1', nombre: 'Creatina real',
  id_publicacion: 'MLC1234567890', lista_id: 'creatina',
  precio: 19990, fecha_precio: '2026-10-30', activo: false,
  enlace_referido: 'https://ejemplo.cl/referido',
  atributos: { gramos_total: 300 },
  historial_precios: [{ fecha: '2026-10-30', precio: 19990 }],
};
const fetchItem = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCatalog).mockResolvedValue({ listas: [], productos: [{ ...product }] });
  vi.mocked(saveRecord).mockResolvedValue(undefined);
  fetchItem.mockResolvedValue({ price: 17990 });
});

describe('revisión manual de precios Mercado Libre', () => {
  it('consulta y muestra la variación sin guardar cambios', async () => {
    const review = await previewPriceChange({}, product.id, fetchItem);
    expect(review).toMatchObject({
      precio_actual: 19990, precio_consultado: 17990, diferencia: -2000, cambio: true,
    });
    expect(fetchItem).toHaveBeenCalledWith('MLC1234567890');
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('solo confirma cambios explícitos y agrega historial preservando el resto', async () => {
    const result = await confirmPriceChange({}, product.id, {
      confirmar: true, precio_actual: 19990, precio_consultado: 17990,
      id_publicacion: 'MLC1234567890',
    }, fetchItem);
    expect(result.actualizado).toBe(true);
    expect(result.producto.precio).toBe(17990);
    expect(result.producto.activo).toBe(false);
    expect(result.producto.enlace_referido).toBe(product.enlace_referido);
    expect(result.producto.atributos).toEqual(product.atributos);
    expect(result.producto.historial_precios).toHaveLength(2);
    expect(saveRecord).toHaveBeenCalledOnce();
  });

  it('rechaza guardado sin confirmación', async () => {
    await expect(confirmPriceChange({}, product.id, {
      precio_actual: 19990, precio_consultado: 17990,
    }, fetchItem)).rejects.toThrow('confirmar');
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('rechaza precio desactualizado, evitando sobrescrituras accidentales', async () => {
    fetchItem.mockResolvedValue({ price: 16990 });
    await expect(confirmPriceChange({}, product.id, {
      confirmar: true, precio_actual: 19990, precio_consultado: 17990,
      id_publicacion: 'MLC1234567890',
    }, fetchItem)).rejects.toMatchObject({ status: 409 });
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('rechaza modificación de publicación o precio anterior', async () => {
    await expect(confirmPriceChange({}, product.id, {
      confirmar: true, precio_actual: 19900, precio_consultado: 17990,
      id_publicacion: 'MLC1234567890',
    }, fetchItem)).rejects.toMatchObject({ status: 409 });
    await expect(confirmPriceChange({}, product.id, {
      confirmar: true, precio_actual: 19990, precio_consultado: 17990,
      id_publicacion: 'MLC999999999',
    }, fetchItem)).rejects.toMatchObject({ status: 409 });
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('rechaza productos sin publicación MLC y precios inválidos', async () => {
    vi.mocked(readCatalog).mockResolvedValue({ listas: [], productos: [{ ...product, id_publicacion: 'MLA1234567890' }] });
    await expect(previewPriceChange({}, product.id, fetchItem)).rejects.toThrow('MLC');
    vi.mocked(readCatalog).mockResolvedValue({ listas: [], productos: [{ ...product }] });
    fetchItem.mockResolvedValue({ price: 0 });
    await expect(previewPriceChange({}, product.id, fetchItem)).rejects.toThrow('precio');
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('no agrega historial cuando el precio no cambió', async () => {
    fetchItem.mockResolvedValue({ price: 19990 });
    const result = await confirmPriceChange({}, product.id, {
      confirmar: true, precio_actual: 19990, precio_consultado: 19990,
      id_publicacion: 'MLC1234567890',
    }, fetchItem);
    expect(result.actualizado).toBe(false);
    expect(saveRecord).not.toHaveBeenCalled();
  });
});
