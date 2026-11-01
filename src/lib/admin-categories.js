import { readCatalog, saveRecord } from './cloudflare-catalog.js';

export class AdminCategoryError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AdminCategoryError';
    this.status = status;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function text(value) { return String(value ?? '').trim(); }
function validSlug(slug) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); }

function normalizedCategory(payload, previous = null) {
  if (!isObject(payload)) throw new AdminCategoryError('Se requiere un objeto JSON.');
  const id = previous?.id ?? text(payload.id || payload.slug);
  const slug = previous?.slug ?? text(payload.slug);
  const nombre = text(payload.nombre ?? previous?.nombre);
  if (!id || !validSlug(id) || !slug || !validSlug(slug)) {
    throw new AdminCategoryError('ID y slug deben contener letras minúsculas, números o guiones.');
  }
  if (nombre.length < 2 || nombre.length > 150) throw new AdminCategoryError('El nombre debe tener entre 2 y 150 caracteres.');
  const base = previous ?? {
    id, slug, nombre, descripcion: '', unidad_base: 'ud',
    orden_defecto: { campo: 'precio', direccion: 'menor' },
    campos: [], metricas: [], mapa_atributos_ml: {}, activa: true,
  };
  const result = {
    ...base,
    nombre,
    descripcion: text(payload.descripcion ?? base.descripcion).slice(0, 2000),
    activa: payload.activa === undefined ? base.activa !== false : payload.activa === true,
  };
  // Una edición básica NO modifica campos, fórmulas ni mapas de atributos.
  return result;
}

function ensureUnique(catalog, category, currentId = null) {
  if (catalog.listas.some((item) => item.id !== currentId && (item.id === category.id || item.slug === category.slug))) {
    throw new AdminCategoryError('Ya existe una categoría con ese identificador o slug.', 409);
  }
}

export async function createAdminCategory(env, payload) {
  const catalog = await readCatalog(env);
  const category = normalizedCategory(payload);
  ensureUnique(catalog, category);
  await saveRecord(env, 'catalog_lists', category);
  return category;
}

export async function updateAdminCategory(env, id, payload) {
  if (!isObject(payload)) throw new AdminCategoryError('Se requiere un objeto JSON.');
  const catalog = await readCatalog(env);
  const existing = catalog.listas.find((item) => item.id === id);
  if (!existing) throw new AdminCategoryError('Categoría no encontrada.', 404);
  if ((payload.id !== undefined && payload.id !== id) ||
      (payload.slug !== undefined && payload.slug !== existing.slug)) {
    throw new AdminCategoryError('No se permite cambiar el ID ni el slug de una categoría existente.');
  }
  const category = normalizedCategory(payload, existing);
  ensureUnique(catalog, category, id);
  await saveRecord(env, 'catalog_lists', category);
  return category;
}

export function categoryErrorResponse(error, jsonResponse) {
  if (error instanceof AdminCategoryError) return jsonResponse({ error: error.message }, error.status);
  console.error('Error de categorías D1:', error);
  return jsonResponse({ error: 'Error interno de categorías.' }, 500);
}
