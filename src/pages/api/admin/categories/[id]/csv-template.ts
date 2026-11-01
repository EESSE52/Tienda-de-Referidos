import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, readCatalog, requireAdmin } from '../../../../../lib/cloudflare-catalog.js';
import { generateCategoryCsvTemplate } from '../../../../../lib/category-csv-template.js';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const denied = requireAdmin({ env, request });
  if (denied) return denied;
  try {
    const catalog = await readCatalog(env);
    const category = catalog.listas.find(item => item.id === params.id || item.slug === params.id);
    if (!category) return jsonResponse({ error: 'Categoría no encontrada.' }, 404);
    const csv = generateCategoryCsvTemplate(category);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="plantilla-' + category.slug + '.csv"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error generando plantilla por categoría:', error);
    return jsonResponse({ error: 'No se pudo crear la plantilla CSV.' }, 500);
  }
};
