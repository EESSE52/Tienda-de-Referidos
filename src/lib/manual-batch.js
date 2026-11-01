import { validateImportBatch } from './admin-import.js';
import { normalizeImportRow } from './normalize-import-row.js';
import { normalizeChileMercadoLibreUrl } from './mercadolibre-review.js';

export function prepareManualBatch(rows, catalog) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10) {
    throw new Error('Selecciona entre 1 y 10 productos para guardar.');
  }
  const current = Array.isArray(catalog?.productos) ? catalog.productos : [];
  const seen = new Set(current.map(p => String(p.id_publicacion || '').replace(/[-_]/g, '').toUpperCase()).filter(Boolean));
  const errors = [];
  const eligible = [];
  for (const [index, candidate] of rows.entries()) {
    try {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('Producto inválido.');
      const id = String(candidate.id_publicacion || '').toUpperCase();
      if (!/^MLC[0-9]{6,}$/.test(id)) throw new Error('ID de publicación MLC inválido.');
      const source = normalizeChileMercadoLibreUrl(candidate.url_publicacion || candidate.enlace_referido || '');
      if (source.kind !== 'item' || source.id !== id) throw new Error('La URL no corresponde al ID MLC de la publicación.');
      if (seen.has(id)) throw new Error('Publicación duplicada: ya existe en el catálogo o está repetida en este lote.');
      const affiliate = String(candidate.enlace_referido || '').trim();
      if (affiliate && !isSafeAffiliateUrl(affiliate)) throw new Error('Enlace de afiliado no válido (usa HTTPS de meli.la o Mercado Libre Chile).');
      seen.add(id);
      eligible.push({
        ...candidate,
        lista_id: String(candidate.lista_id || ''),
        id_publicacion: id,
        // Los productos manuales deben mantenerse inactivos hasta revisión.
        activo: false,
        es_prueba: false,
      });
    } catch (error) {
      errors.push({ row: index + 1, message: error.message });
    }
  }
  const result = validateImportBatch(eligible, catalog, normalizeImportRow);
  // No permitir guardados parciales: el usuario debe resolver todos los errores.
  return { accepted: errors.length || result.errors.length ? [] : result.accepted,
    errors: [...errors, ...result.errors], total: rows.length };
}

function isSafeAffiliateUrl(value) {
  try {
    const link = new URL(value);
    return link.protocol === 'https:' && !link.username && !link.password && !link.port && link.href.length <= 2048 &&
      ['meli.la', 'mercadolibre.cl', 'www.mercadolibre.cl', 'articulo.mercadolibre.cl'].includes(link.hostname.toLowerCase());
  } catch { return false; }
}
