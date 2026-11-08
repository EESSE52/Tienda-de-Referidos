import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./cloudflare-catalog.js', () => ({ readCatalog: vi.fn(), saveRecord: vi.fn() }));
import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { registerManualPriceReview } from './price-manual-review.js';

const now = new Date('2026-11-08T15:00:00Z');
const original = Object.freeze({
  id: 'MLC1859621269', lista_id: 'creatina', nombre: 'Foodtech 1 kg',
  precio: 34990, fecha_precio: '2026-10-25', id_publicacion: 'MLC1859621269',
  url_publicacion: 'https://articulo.mercadolibre.cl/MLC-1859621269',
  enlace_referido: 'https://meli.la/22bG2Z5', activo: true,
  atributos: { gramos_total: 1000 }, historial_precios: [{ fecha:'2026-10-25', precio:34990 }],
});
const body = { confirmar: true, fuente: 'mercadolibre_manual', precio_actual: 34990,
  precio_observado: 32990, id_publicacion: 'MLC1859621269' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCatalog).mockResolvedValue({ listas: [], productos: [original] });
  vi.mocked(saveRecord).mockResolvedValue();
});

describe('revisión manual de precios con historial', () => {
  it('registra precio observado y preserva enlace afiliado, atributos y resto del producto', async () => {
    const result = await registerManualPriceReview({}, original.id, body, now);
    expect(result.actualizado).toBe(true);
    expect(result.producto).toMatchObject({
      precio: 32990, fecha_precio: '2026-11-08', precio_fuente: 'manual',
      enlace_referido: original.enlace_referido, atributos: original.atributos,
      ultima_revision: '2026-11-08T15:00:00.000Z',
    });
    expect(result.producto.historial_precios).toHaveLength(2);
    expect(result.producto.historial_revisiones).toEqual([{
      fecha: '2026-11-08', precio_observado: 32990, fuente: 'mercadolibre_manual', cambio: true,
    }]);
    expect(saveRecord).toHaveBeenCalledWith({}, 'catalog_products', expect.any(Object));
    expect(original.precio).toBe(34990);
  });
  it('actualiza la fecha tras revisar un precio sin cambios sin duplicar historial de precios', async () => {
    const result = await registerManualPriceReview({}, original.id,
      { ...body, precio_observado: 34990 }, now);
    expect(result.actualizado).toBe(false);
    expect(result.revisado).toBe(true);
    expect(result.producto.fecha_precio).toBe('2026-11-08');
    expect(result.producto.historial_precios).toHaveLength(1);
    expect(result.producto.historial_revisiones[0].cambio).toBe(false);
  });
  it('exige confirmación, fuente y precios CLP enteros positivos', async () => {
    for (const change of [
      { confirmar: false }, { fuente: 'api' },
      { precio_observado: 0 }, { precio_observado: 32.5 }, { precio_observado: 'falso' },
    ]) await expect(registerManualPriceReview({}, original.id, { ...body, ...change }, now)).rejects.toThrow();
    expect(saveRecord).not.toHaveBeenCalled();
  });
  it('protege contra modificaciones concurrentes de precio y publicación', async () => {
    await expect(registerManualPriceReview({}, original.id,
      { ...body, precio_actual: 30000 }, now)).rejects.toMatchObject({ status: 409 });
    await expect(registerManualPriceReview({}, original.id,
      { ...body, id_publicacion: 'MLC999999999' }, now)).rejects.toMatchObject({ status: 409 });
    expect(saveRecord).not.toHaveBeenCalled();
  });
  it('rechaza publicaciones ficticias o URLs de tiendas ajenas', async () => {
    vi.mocked(readCatalog).mockResolvedValueOnce({ listas:[], productos:[{...original, es_prueba:true}] });
    await expect(registerManualPriceReview({}, original.id, body, now)).rejects.toThrow('prueba');
    vi.mocked(readCatalog).mockResolvedValueOnce({ listas:[], productos:[{...original, url_publicacion:'https://mercadolibre.cl.ejemplo.com/MLC'}] });
    await expect(registerManualPriceReview({}, original.id, body, now)).rejects.toThrow('oficial');
    expect(saveRecord).not.toHaveBeenCalled();
  });
  it('admite producto antiguo sin URL si conserva identificador oficial MLC', async () => {
    vi.mocked(readCatalog).mockResolvedValue({ listas:[], productos:[{...original, url_publicacion:''}] });
    expect((await registerManualPriceReview({}, original.id, body, now)).revisado).toBe(true);
  });
});
