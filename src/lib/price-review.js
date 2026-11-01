import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { fetchMercadoLibreItem } from './mercadolibre.js';
import { getMercadoLibreItemId } from './mercadolibre-payload.js';

export class PriceReviewError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'PriceReviewError'; this.status = status; }
}

function getItemId(product) {
  const id = getMercadoLibreItemId(product.id_publicacion || '');
  if (!/^MLC[0-9]{6,}$/.test(id)) throw new PriceReviewError('El producto no tiene una publicación MLC válida.');
  return id;
}

function readPrice(value, origin = 'Mercado Libre') {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || !Number.isSafeInteger(num)) {
    throw new PriceReviewError(origin === 'registro' ? 'El precio registrado es inválido; revísalo en el administrador.' : 'Mercado Libre no entregó un precio CLP válido para esta publicación. Verifica que la publicación sea real, esté vigente y muestre un precio. No se guardó ningún cambio.');
  }
  return num;
}

async function findProduct(env, id) {
  const catalog = await readCatalog(env);
  const product = catalog.productos.find(item => item.id === id);
  if (!product) throw new PriceReviewError('Producto no encontrado.', 404);
  const current = readPrice(product.precio, 'registro');
  return { product, current, itemId: getItemId(product) };
}

export async function previewPriceChange(env, id, fetchItem = fetchMercadoLibreItem) {
  const { product, current, itemId } = await findProduct(env, id);
  const result = await fetchItem(itemId);
  const proposed = readPrice(result.price);
  return {
    producto_id: product.id, nombre: product.nombre, id_publicacion: itemId,
    precio_actual: current, precio_consultado: proposed,
    diferencia: proposed - current,
    porcentaje: Number(((proposed - current) / current * 100).toFixed(2)),
    cambio: current !== proposed,
    advertencia: 'Precio consultado: requiere confirmación manual. No valida afiliación ni disponibilidad.',
  };
}

/**
 * La confirmación vuelve a consultar Mercado Libre y verifica que ningún precio haya
 * cambiado entre vista previa y guardado. Nunca modifica enlaces, atributos ni estado.
 */
export async function confirmPriceChange(env, id, body, fetchItem = fetchMercadoLibreItem) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.confirmar !== true) {
    throw new PriceReviewError('Debes confirmar explícitamente la actualización.');
  }
  const { product, current, itemId } = await findProduct(env, id);
  const expectedCurrent = readPrice(body.precio_actual);
  const expectedNew = readPrice(body.precio_consultado);
  if (current !== expectedCurrent || itemId !== body.id_publicacion) {
    throw new PriceReviewError('El producto cambió desde la última revisión. Consulta el precio nuevamente.', 409);
  }
  const source = await fetchItem(itemId);
  const newPrice = readPrice(source.price);
  if (newPrice !== expectedNew) {
    throw new PriceReviewError('Mercado Libre cambió su precio. Consulta el precio nuevamente.', 409);
  }
  if (current === newPrice) return { actualizado: false, producto: product };
  const date = new Date().toISOString().slice(0, 10);
  const previousHistory = Array.isArray(product.historial_precios) ? product.historial_precios : [];
  const history = previousHistory.length
    ? previousHistory.slice()
    : [{ fecha: product.fecha_precio || date, precio: current }];
  history.push({ fecha: date, precio: newPrice });
  const updated = {
    ...product, precio: newPrice, fecha_precio: date,
    precio_fuente: 'api', ultima_revision: new Date().toISOString(),
    historial_precios: history, actualizado: new Date().toISOString(),
  };
  await saveRecord(env, 'catalog_products', updated);
  return { actualizado: true, producto: updated };
}
