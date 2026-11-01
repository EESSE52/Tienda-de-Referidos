import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readCatalog, readJsonBody, requireAdmin, saveRecord } from '../../../../lib/cloudflare-catalog.js';
import { validateImportBatch } from '../../../../lib/admin-import.js';
import { normalizeImportRow } from '../../../../lib/normalize-import-row.js';

export const POST: APIRoute = async (context) => {
  const denied = requireAdmin({ env, request: context.request });
  if (denied) return denied;

  try {
    const body = await readJsonBody(context.request);
    const rows = Array.isArray(body) ? body : Array.isArray(body?.rows) ? body.rows : [];

    if (!rows.length) {
      return jsonResponse({ error: 'No se recibieron filas válidas para importar.' }, 400);
    }

    if (rows.length > 500) {
      return jsonResponse({ error: 'Máximo 500 productos por importación.' }, 400);
    }

    const catalog = await readCatalog(env);
    const { accepted, errors } = validateImportBatch(rows, catalog, normalizeImportRow);
    // Guardar únicamente los registros previamente validados.
    for (const record of accepted) {
      await saveRecord(env, 'catalog_products', record);
    }

    return jsonResponse({
      ok: accepted.length > 0,
      total: rows.length,
      imported: accepted.length,
      errors,
      message: accepted.length > 0 ? `Se importaron ${accepted.length} productos.` : 'No se importó ningún producto.',
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'No se pudo importar el archivo.' }, 400);
  }
};
