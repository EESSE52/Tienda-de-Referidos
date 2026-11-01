import { validateProductPayload } from './admin-validacion.js';

/**
 * Valida cada fila contra el catálogo existente y las filas aceptadas
 * previamente. No escribe nada; las filas rechazadas no se importan.
 */
export function validateImportBatch(rows, catalog, normalize) {
  const accepted = [];
  const errors = [];
  const currentProducts = Array.isArray(catalog?.productos) ? catalog.productos : [];
  const categories = Array.isArray(catalog?.listas) ? catalog.listas : [];
  for (const [index, row] of rows.entries()) {
    try {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error('La fila debe contener columnas válidas.');
      }
      const categoryId = String(row.lista_id ?? row.lista ?? 'creatina').trim() || 'creatina';
      const category = categories.find(item => item.id === categoryId || item.slug === categoryId);
      if (!category) throw new Error('La categoría indicada no existe.');
      const candidate = normalize(row, category);
      if (candidate.lista_id !== category.id && candidate.lista_id !== category.slug) {
        throw new Error('La categoría indicada no existe.');
      }
      const validated = validateProductPayload(candidate, [...currentProducts, ...accepted], null);
      if ([...currentProducts, ...accepted].some((product) => product.id === validated.id)) {
        throw new Error('Ya existe un producto con ese identificador.');
      }
      accepted.push(validated);
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : 'Fila inválida.',
      });
    }
  }
  return { accepted, errors };
}
