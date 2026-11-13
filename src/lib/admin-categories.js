import { aminoCategoryProfile } from './amino-category-profile.js';
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
  if (payload?.plantilla_id) {
    const source = catalog.listas.find((item) => item.id === payload.plantilla_id);
    if (!source) throw new AdminCategoryError('La categoría usada como plantilla no existe.');
    // Copia independiente de la configuración de comparación. No copia productos.
    category.unidad_base = source.unidad_base ?? 'ud';
    category.orden_defecto = structuredClone(source.orden_defecto ?? { campo: 'precio', direccion: 'menor' });
    category.campos = structuredClone(source.campos ?? []);
    category.metricas = structuredClone(source.metricas ?? []);
    category.mapa_atributos_ml = structuredClone(source.mapa_atributos_ml ?? {});
  }
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
  // Reconfiguración explícita, limitada a la categoría amino, sin borrar registros.
  if (payload.aplicar_perfil_aminoacidos === true) {
    if (id !== 'amino' || existing.slug !== 'amino') {
      throw new AdminCategoryError('Este perfil solo se puede aplicar a la categoría amino.');
    }
    const configured = aminoCategoryProfile(existing);
    await saveRecord(env, 'catalog_lists', configured);
    return configured;
  }
  const category = normalizedCategory(payload, existing);
  ensureUnique(catalog, category, id);
  await saveRecord(env, 'catalog_lists', category);
  return category;
}


/**
 * Añade un campo numérico y su métrica precio / campo.
 * Nunca modifica ni elimina métricas existentes.
 */
export async function addCategoryMetric(env, id, payload) {
  if (!isObject(payload)) throw new AdminCategoryError('Se requiere un objeto JSON.');
  const catalog = await readCatalog(env);
  const previous = catalog.listas.find((item) => item.id === id);
  if (!previous) throw new AdminCategoryError('Categoría no encontrada.', 404);
  const clave = text(payload.clave);
  const etiqueta = text(payload.etiqueta);
  const unidad = text(payload.unidad);
  if (!validSlug(clave) && !/^[a-z][a-z0-9_]*$/.test(clave)) {
    throw new AdminCategoryError('La clave debe usar letras minúsculas, números o guion bajo.');
  }
  if (!/^[a-z][a-z0-9_]*$/.test(clave)) {
    throw new AdminCategoryError('Usa letras minúsculas, números y guion bajo para la clave.');
  }
  if (etiqueta.length < 2 || etiqueta.length > 90 || unidad.length > 20) {
    throw new AdminCategoryError('Etiqueta o unidad inválida.');
  }
  const campos = structuredClone(previous.campos ?? []);
  const metricas = structuredClone(previous.metricas ?? []);
  const metricaClave = 'precio_por_' + clave;
  if (campos.some((campo) => campo.clave === clave) ||
      metricas.some((metrica) => metrica.clave === metricaClave)) {
    throw new AdminCategoryError('Ya existe ese campo o esa métrica.', 409);
  }
  if (campos.length >= 30 || metricas.length >= 30) {
    throw new AdminCategoryError('Máximo 30 campos y métricas por categoría.');
  }
  campos.push({
    clave, etiqueta, tipo: 'numero', unidad: unidad || null,
    mejor: 'mayor', en_tabla: true, filtrable: true, requerido: false,
  });
  metricas.push({
    clave: metricaClave,
    etiqueta: 'Precio por ' + etiqueta.toLowerCase(),
    plantilla: { tipo: 'precio_dividido_por', campo: clave },
    formula: { tipo: 'precio_dividido_por', campo: clave },
    mejor: 'menor', decimales: 2,
  });
  const category = { ...previous, campos, metricas };
  await saveRecord(env, 'catalog_lists', category);
  return category;
}

export function categoryErrorResponse(error, jsonResponse) {
  if (error instanceof AdminCategoryError) return jsonResponse({ error: error.message }, error.status);
  console.error('Error de categorías D1:', error);
  return jsonResponse({ error: 'Error interno de categorías.' }, 500);
}

/**
 * Ajusta un campo de una categoría sin alterar las demás categorías o sus métricas.
 * Útil para variantes como Creatina gomitas: no exigir gramos sin información.
 */
export async function configureCategoryField(env, id, payload) {
  if (!isObject(payload)) throw new AdminCategoryError('Se requiere un objeto JSON.');
  const catalog = await readCatalog(env);
  const previous = catalog.listas.find(item => item.id === id);
  if (!previous) throw new AdminCategoryError('Categoría no encontrada.', 404);
  const clave = text(payload.clave);
  const campos = structuredClone(previous.campos ?? []);
  const field = campos.find(item => item.clave === clave);
  if (!field) throw new AdminCategoryError('Campo no encontrado en esta categoría.', 404);
  if (payload.requerido !== undefined && typeof payload.requerido !== 'boolean') {
    throw new AdminCategoryError('El estado obligatorio debe ser verdadero o falso.');
  }
  if (payload.requerido !== undefined) field.requerido = payload.requerido;
  if (payload.opciones !== undefined) {
    if (field.tipo !== 'seleccion') throw new AdminCategoryError('Solo los campos de selección admiten opciones.');
    if (!Array.isArray(payload.opciones) || payload.opciones.length < 1 || payload.opciones.length > 30) {
      throw new AdminCategoryError('Debes indicar entre 1 y 30 opciones.');
    }
    const opciones = payload.opciones.map(value => text(value));
    if (opciones.some(value => !value || value.length > 90) || new Set(opciones).size !== opciones.length) {
      throw new AdminCategoryError('Las opciones deben ser únicas y tener entre 1 y 90 caracteres.');
    }
    field.opciones = opciones;
  }
  const category = { ...previous, campos };
  await saveRecord(env, 'catalog_lists', category);
  return category;
}
