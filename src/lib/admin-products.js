import { readCatalog, saveRecord } from './cloudflare-catalog.js';
import { validateProductPayload } from './admin-validacion.js';
import { normalizeCategoryAttributes } from './category-attributes.js';

export class AdminProductError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AdminProductError';
    this.status = status;
  }
}

function ensurePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AdminProductError('El producto debe ser un objeto JSON.');
  }
  return body;
}

function validateCategory(catalog, listId) {
  if (!catalog.listas.some((lista) => lista.id === listId || lista.slug === listId)) {
    throw new AdminProductError('La categoría seleccionada no existe.');
  }
}

export async function createAdminProduct(env, body) {
  const payload = ensurePayload(body);
  const catalog = await readCatalog(env);
  const candidate = validateProductPayload(payload, catalog.productos);
  validateCategory(catalog, candidate.lista_id);
  if (catalog.productos.some((product) => product.id === candidate.id)) {
    throw new AdminProductError('Ya existe un producto con ese identificador.', 409);
  }
  const category = catalog.listas.find((item) => item.id === candidate.lista_id || item.slug === candidate.lista_id);
  candidate.atributos = normalizeCategoryAttributes(category, candidate.atributos);
  await saveRecord(env, 'catalog_products', candidate);
  return candidate;
}

export async function getAdminProduct(env, id) {
  const catalog = await readCatalog(env);
  const product = catalog.productos.find((item) => item.id === id);
  if (!product) throw new AdminProductError('Producto no encontrado.', 404);
  return product;
}

export async function updateAdminProduct(env, id, body) {
  const payload = ensurePayload(body);
  const catalog = await readCatalog(env);
  const existing = catalog.productos.find((item) => item.id === id);
  if (!existing) throw new AdminProductError('Producto no encontrado.', 404);
  if (payload.id !== undefined && payload.id !== id) {
    throw new AdminProductError('No se puede cambiar el identificador del producto.');
  }
  const candidate = validateProductPayload({ ...existing, ...payload, id }, catalog.productos, id);
  validateCategory(catalog, candidate.lista_id);
  const category = catalog.listas.find((item) => item.id === candidate.lista_id || item.slug === candidate.lista_id);
  candidate.atributos = normalizeCategoryAttributes(category, candidate.atributos, existing.atributos);
  await saveRecord(env, 'catalog_products', candidate);
  return candidate;
}

export async function deactivateAdminProduct(env, id) {
  const catalog = await readCatalog(env);
  const existing = catalog.productos.find((item) => item.id === id);
  if (!existing) throw new AdminProductError('Producto no encontrado.', 404);
  const product = { ...existing, activo: false, actualizado: new Date().toISOString() };
  await saveRecord(env, 'catalog_products', product);
  return product;
}

export function adminProductErrorResponse(error, jsonResponse) {
  if (error instanceof AdminProductError) {
    return jsonResponse({ error: error.message }, error.status);
  }
  console.error('Error en productos D1:', error);
  return jsonResponse({ error: 'Error interno al procesar el producto.' }, 500);
}
