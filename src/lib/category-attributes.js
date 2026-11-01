/**
 * Comprueba y convierte atributos según los campos configurados de la categoría.
 * Mantiene atributos históricos no declarados para no perder información al editar.
 */
export function normalizeCategoryAttributes(category, incoming = {}, previous = {}) {
  if (!category || !Array.isArray(category.campos)) throw new Error('Categoría inválida.');
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('Atributos inválidos.');
  const output = { ...(previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {}) };
  for (const field of category.campos) {
    const key = field.clave;
    if (!/^[a-z][a-z0-9_]*$/.test(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) continue;
    const value = incoming[key];
    if (value === '' || value === null || value === undefined) {
      if (field.requerido) throw new Error('Falta el campo obligatorio: ' + field.etiqueta);
      delete output[key];
      continue;
    }
    if (field.tipo === 'numero') {
      const numeric = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
      if (!Number.isFinite(numeric) || numeric < 0) throw new Error('Número inválido en: ' + field.etiqueta);
      output[key] = numeric;
    } else if (field.tipo === 'seleccion') {
      const text = String(value).trim();
      if (Array.isArray(field.opciones) && field.opciones.length && !field.opciones.includes(text)) {
        throw new Error('Opción inválida para: ' + field.etiqueta);
      }
      output[key] = text;
    } else {
      output[key] = String(value).trim().slice(0, 500);
    }
  }
  for (const field of category.campos) {
    if (field.requerido && (output[field.clave] === undefined || output[field.clave] === '')) {
      throw new Error('Falta el campo obligatorio: ' + field.etiqueta);
    }
  }
  return output;
}
