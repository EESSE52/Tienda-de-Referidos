import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { PriceReviewError } from './price-review.js';

/**
 * Revisión manual declarada por administrador. No consulta API ni verifica
 * afiliación o disponibilidad. Protege cambios concurrentes por precio esperado.
 */
export async function registerManualPriceReview(env, id, input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.confirmar !== true)
    throw new PriceReviewError('Debes confirmar expresamente la revisión manual.');
  if (input.fuente !== 'mercadolibre_manual')
    throw new PriceReviewError('La fuente debe ser una comprobación manual de Mercado Libre.');
  const date = now.toISOString().slice(0, 10);
  const amount = Number(input.precio_observado);
  const expected = Number(input.precio_actual);
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(expected) || expected <= 0)
    throw new PriceReviewError('Indica precios CLP enteros y positivos.');
  const catalog = await readCatalog(env);
  const product = catalog.productos.find(p => p.id === id);
  if (!product) throw new PriceReviewError('Producto no encontrado.', 404);
  if (product.es_prueba === true) throw new PriceReviewError('No se registran precios de mercado para productos de prueba.');
  if (Number(product.precio) !== expected)
    throw new PriceReviewError('El precio registrado cambió. Actualiza el listado antes de guardar.', 409);
  if (String(input.id_publicacion || '') !== String(product.id_publicacion || ''))
    throw new PriceReviewError('La publicación cambió. Actualiza el listado antes de guardar.', 409);
  const publicationUrl = String(product.url_publicacion || '').trim();
  // Si el registro antiguo carece de URL se acepta un ID MLC válido,
  // que el administrador abre en la ficha oficial.
  if (!publicationUrl) {
    if (!/^MLC[0-9]{6,}$/i.test(String(product.id_publicacion || '').replace(/[-_]/g, '')))
      throw new PriceReviewError('La publicación necesita un ID MLC válido o una URL oficial.');
  } else {
    let url;
    try { url = new URL(publicationUrl); } catch {
      throw new PriceReviewError('La URL de publicación no es válida.');
    }
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !(host === 'mercadolibre.cl' || host.endsWith('.mercadolibre.cl')))
      throw new PriceReviewError('La revisión manual exige una URL oficial de Mercado Libre Chile.');
  }
  const previous = Array.isArray(product.historial_precios) ? product.historial_precios.slice() : [];
  const history = previous.length ? previous : [{ fecha: product.fecha_precio || date, precio: expected }];
  const changed = expected !== amount;
  if (changed) history.push({ fecha: date, precio: amount, fuente: 'mercadolibre_manual' });
  const reviews = Array.isArray(product.historial_revisiones) ? product.historial_revisiones.slice() : [];
  reviews.push({ fecha: date, precio_observado: amount, fuente: 'mercadolibre_manual', cambio: changed });
  const updated = {
    ...product,
    precio: amount,
    fecha_precio: date,
    precio_fuente: 'manual',
    ultima_revision: now.toISOString(),
    historial_precios: history,
    historial_revisiones: reviews,
    actualizado: now.toISOString(),
  };
  await saveRecord(env, 'catalog_products', updated);
  return { actualizado: changed, revisado: true, producto: updated };
}
