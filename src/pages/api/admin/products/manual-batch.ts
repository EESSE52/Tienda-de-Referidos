import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readCatalog, readJsonBody, requireAdmin, saveRecord } from '../../../../lib/cloudflare-catalog.js';
import { prepareManualBatch } from '../../../../lib/manual-batch.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    if (!body || !Array.isArray(body.rows) || !['preview', 'confirm'].includes(body.action)) {
      return jsonResponse({ error: 'Solicitud inválida: requiere rows y action.' }, 400);
    }
    const catalog = await readCatalog(env);
    const { accepted, errors, total } = prepareManualBatch(body.rows, catalog);
    if (errors.length) return jsonResponse({ ok: false, total, imported: 0, errors, error: errors.map(item => 'Fila ' + item.row + ': ' + item.message).join(' | ') }, 422);
    if (body.action === 'preview') {
      return jsonResponse({ ok: true, total, imported: 0, preview: accepted.map(({ nombre, id_publicacion, precio, lista_id, activo }) => ({ nombre, id_publicacion, precio, lista_id, activo })) });
    }
    for (const record of accepted) await saveRecord(env, 'catalog_products', record);
    return jsonResponse({ ok: true, total, imported: accepted.length, message: 'Productos guardados inactivos para revisión.' });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'No se pudo procesar el lote.' }, 400);
  }
};
