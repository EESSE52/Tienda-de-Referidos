import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readCatalog, readJsonBody, requireAdmin, saveRecord } from '../../../../lib/cloudflare-catalog.js';
import { validateImportBatch } from '../../../../lib/admin-import.js';

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = String(value).trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const input = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí', 'on'].includes(input)) return true;
  if (['false', '0', 'no', 'off'].includes(input)) return false;
  return Boolean(value);
}

function parseAttributes(raw: Record<string, unknown>) {
  const atributos: Record<string, unknown> = {};
  const entries = Object.entries(raw ?? {});

  for (const [key, value] of entries) {
    const normalizedKey = String(key).trim().toLowerCase();
    if (!normalizedKey) continue;

    if (['gramos_total', 'porciones', 'cantidad_unidades', 'precio', 'precio_original'].includes(normalizedKey)) {
      const numeric = parseNumber(value);
      if (numeric !== null) atributos[normalizedKey] = numeric;
      continue;
    }

    if (['libre_gluten', 'activo', 'envio_gratis', 'despacho_full', 'tienda_oficial', 'mercadolider'].includes(normalizedKey)) {
      atributos[normalizedKey] = parseBoolean(value);
      continue;
    }

    if (value !== '' && value !== null && value !== undefined) {
      atributos[normalizedKey] = String(value).trim();
    }
  }

  return atributos;
}

function normalizeProductRow(row: Record<string, unknown>) {
  const normalizedRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[String(key).trim().toLowerCase()] = value;
  }

  const listaId = String(normalizedRow.lista_id ?? normalizedRow.lista ?? 'creatina').trim() || 'creatina';
  const nombre = String(normalizedRow.nombre ?? '').trim();
  const marca = String(normalizedRow.marca ?? '').trim();
  const precio = parseNumber(normalizedRow.precio ?? normalizedRow.precio_clp ?? 0) ?? 0;
  const idPublicacion = String(normalizedRow.id_publicacion ?? normalizedRow.id ?? '').trim();
  const enlaceReferido = String(normalizedRow.enlace_referido ?? normalizedRow.url_publicacion ?? normalizedRow.link ?? '').trim();
  const imagen = String(normalizedRow.imagen ?? '').trim();
  const activo = normalizedRow.activo === undefined ? true : parseBoolean(normalizedRow.activo);

  const atributos: Record<string, unknown> = parseAttributes({
    ...normalizedRow,
    tipo: normalizedRow.tipo ?? normalizedRow.formato ?? '',
    sabor: normalizedRow.sabor ?? '',
    gramos_total: normalizedRow.gramos_total ?? normalizedRow.gramos ?? '',
    porciones: normalizedRow.porciones ?? '',
    cantidad_unidades: normalizedRow.cantidad_unidades ?? '',
    libre_gluten: normalizedRow.libre_gluten ?? '',
    objetivo: normalizedRow.objetivo ?? '',
  });

  return {
    id: String(normalizedRow.id ?? (idPublicacion || `${listaId}-${crypto.randomUUID()}`)),
    lista_id: listaId,
    nombre,
    marca,
    precio,
    id_publicacion: idPublicacion,
    enlace_referido: enlaceReferido,
    url_publicacion: enlaceReferido,
    imagen,
    activo,
    atributos,
  };
}

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
    const { accepted, errors } = validateImportBatch(rows, catalog, normalizeProductRow);
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
