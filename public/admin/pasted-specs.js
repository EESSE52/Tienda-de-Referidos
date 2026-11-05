/* Extrae pares clave-valor de texto/tabla pegada en administración. No usa red. */
function plain(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#x20;|&amp;/gi, ' ')
    .replace(/\*\*/g, '').replace(/^\s*[*_]+|[*_]+\s*$/g, '').trim();
}
function key(value) {
  return plain(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
const ALIASES = {
  gramos_total: ['peso neto','contenido neto','peso del producto','gramos total','gramos totales','contenido total'],
  porciones: ['cantidad de porciones','numero de porciones','porciones por envase','total de porciones','porciones'],
  cantidad_unidades: ['unidades por envase','cantidad de unidades','unidades por paquete','unidades por frasco'],
  sabor: ['sabor'],
  tipo: ['formato del suplemento','formato de suplemento','presentacion','forma del suplemento','tipo'],
  formato: ['formato del suplemento','formato de suplemento','presentacion','forma del suplemento'],
  libre_gluten: ['es libre de gluten','libre de gluten','sin gluten'],
  vegano: ['es vegano','vegano'],
  peso_porcion: ['peso de la porcion','tamano de la porcion'],
  volumen_porcion: ['volumen de la porcion'],
  ingredientes: ['ingredientes'],
  suplemento_principal: ['suplemento principal'],
  clase_suplemento: ['clase de suplemento'],
  nombre_comercial: ['nombre comercial'],
};
export function extractPastedPairs(text) {
  if (typeof text !== 'string' || text.length > 30000) throw new Error('Pega un texto de hasta 30.000 caracteres.');
  const pairs = [];
  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || /^#{1,6}\s/.test(raw) || /^caracteristicas del producto$/i.test(raw)) continue;
    let label = '', value = '';
    if (raw.startsWith('|')) {
      const parts = raw.split('|').slice(1, -1).map(plain);
      if (parts.length < 2 || parts.every(part => /^[:\-\s]+$/.test(part))) continue;
      [label, value] = parts;
    } else {
      const colon = raw.match(/^\s*(?:[-*]\s*)?([^:|]{2,100}):\s*(.{1,500})\s*$/);
      if (colon) [, label, value] = colon;
    }
    label = plain(label);
    value = plain(value);
    if (!label || !value || /^[\s:-]+$/.test(value) || key(label) === key(value)) continue;
    pairs.push({ label, value });
  }
  return pairs.slice(0, 200);
}
function toNumber(value, field) {
  const raw = plain(value).replace(/\s/g, '');
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos|ml|l|unidades|uds)?$/i);
  if (!match) return null;
  const numeric = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  if (['gramos_total', 'peso_porcion'].includes(field)) {
    if (!match[2] || /^(g|gr|gramos)$/i.test(match[2])) return numeric;
    if (/^kg$/i.test(match[2])) return numeric * 1000;
    return null;
  }
  if (field === 'volumen_porcion') {
    if (!match[2] || /^ml$/i.test(match[2])) return numeric;
    if (/^l$/i.test(match[2])) return numeric * 1000;
    return null;
  }
  if (match[2] && !/^(unidades|uds)$/i.test(match[2])) return null;
  return numeric;
}
function findField(pair, fields) {
  const normalizedLabel = key(pair.label);
  const exact = fields.find(field => key(field.etiqueta || field.clave) === normalizedLabel || key(field.clave) === normalizedLabel);
  if (exact) return exact;
  return fields.find(field => (ALIASES[field.clave] || []).some(alias => key(alias) === normalizedLabel)) || null;
}
function convert(value, field) {
  if (field.tipo === 'numero') return toNumber(value, field.clave);
  if (field.tipo === 'seleccion') {
    return (field.opciones || []).find(option => key(option) === key(value)) ?? null;
  }
  return plain(value).slice(0, 500);
}
export function previewPastedSpecifications(text, category) {
  const fields = Array.isArray(category?.campos) ? category.campos : [];
  const pairs = extractPastedPairs(text);
  const mapped = {}, matched = [], unmatched = [], warnings = [];
  let brand = '';
  for (const pair of pairs) {
    const label = key(pair.label);
    if (label === 'marca') {
      if (brand && key(brand) !== key(pair.value)) warnings.push('Se encontraron marcas diferentes: revisa el texto.');
      brand = pair.value.slice(0, 150);
      matched.push({ ...pair, target: 'Marca', value: brand });
      continue;
    }
    const field = findField(pair, fields);
    if (!field) { unmatched.push(pair); continue; }
    const value = convert(pair.value, field);
    if (value === null || value === '') {
      warnings.push('Revisa «' + pair.label + '»: «' + pair.value + '» no coincide con el formato/opciones de «' + (field.etiqueta || field.clave) + '».');
      unmatched.push(pair);
      continue;
    }
    if (mapped[field.clave] !== undefined && mapped[field.clave] !== value) {
      warnings.push('Valores distintos para «' + (field.etiqueta || field.clave) + '»: se mantuvo el primero.');
      continue;
    }
    mapped[field.clave] = value;
    matched.push({ ...pair, target: field.etiqueta || field.clave, value });
  }
  if (!pairs.length) warnings.push('No se encontraron características en formato Etiqueta: valor o tabla Markdown de dos columnas.');
  return { brand, mapped, matched, unmatched, warnings };
}
