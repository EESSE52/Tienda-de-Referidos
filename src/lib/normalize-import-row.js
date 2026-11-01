import { normalizeCategoryAttributes } from './category-attributes.js';

const RESERVED = new Set([
  'id','lista_id','lista','nombre','marca','precio','precio_clp','precio_original',
  'id_publicacion','enlace_referido','url_publicacion','link','imagen','activo',
  'es_prueba','atributos','vendedor','formato',
]);
const LEGACY = ['gramos_total', 'porciones', 'cantidad_unidades', 'sabor', 'tipo', 'libre_gluten', 'objetivo'];
const NUMBER_KEYS = new Set(['gramos_total', 'porciones', 'cantidad_unidades']);

function priceNumber(value) {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return 0;
  const result = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/\.(?=\d{3}(\D|$))/g, ''));
  return Number.isFinite(result) ? result : 0;
}

function bool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).toLowerCase().trim();
  if (['true','1','si','sí','yes','on'].includes(text)) return true;
  if (['false','0','no','off'].includes(text)) return false;
  throw new Error('Valor booleano inválido: ' + String(value));
}

export function normalizeImportRow(row, category) {
  const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key).trim().toLowerCase(), value]));
  const listaId = String(values.lista_id ?? values.lista ?? 'creatina').trim() || 'creatina';
  const names = Array.isArray(category?.campos) && category.campos.length
    ? category.campos
    : LEGACY.map(clave => ({ clave, tipo: NUMBER_KEYS.has(clave) ? 'numero' : 'texto' }));
  const incoming = values.atributos && typeof values.atributos === 'object' && !Array.isArray(values.atributos)
    ? { ...values.atributos } : {};
  const fieldKeys = new Set(names.map(field => field.clave));
  for (const [key, value] of Object.entries(values)) {
    if (fieldKeys.has(key) && value !== '' && value !== null && value !== undefined) incoming[key] = value;
  }
  // Compatibilidad de columnas antiguas usadas por la plantilla CSV.
  if (fieldKeys.has('gramos_total') && incoming.gramos_total === undefined && values.gramos !== undefined) {
    incoming.gramos_total = values.gramos;
  }
  if (fieldKeys.has('tipo') && incoming.tipo === undefined && values.formato !== undefined) {
    incoming.tipo = values.formato;
  }
  // Se validan los campos reales de la categoría; no se mezclan columnas de otra categoría.
  const atributos = normalizeCategoryAttributes({ campos: names }, incoming, {}, true);
  const idPublicacion = String(values.id_publicacion ?? '').trim();
  const url = String(values.enlace_referido ?? values.url_publicacion ?? values.link ?? '').trim();
  const id = String(values.id || idPublicacion || listaId + '-' + crypto.randomUUID()).trim();
  const unknown = Object.keys(values).filter(key => !RESERVED.has(key) && !fieldKeys.has(key) && !['gramos'].includes(key) && values[key] !== '');
  // No bloquear otras columnas exportadas, pero nunca copiarlas a atributos.
  void unknown;
  return {
    id, lista_id: listaId,
    nombre: String(values.nombre ?? '').trim(),
    marca: String(values.marca ?? '').trim(),
    precio: priceNumber(values.precio ?? values.precio_clp),
    id_publicacion: idPublicacion, enlace_referido: url, url_publicacion: url,
    imagen: String(values.imagen ?? '').trim(),
    activo: bool(values.activo, false),
    es_prueba: bool(values.es_prueba, false),
    atributos,
  };
}
