// Rutas públicas permitidas para buscadores; evita fichas de prueba e inactivas.
export const SITE_ORIGIN = 'https://dmonkeysport.com';

const safeSegment = value => encodeURIComponent(String(value ?? '').trim());
const safeId = value => /^[a-zA-Z0-9_-]{1,100}$/.test(String(value ?? ''));
const safeSlug = value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value ?? ''));
const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function publicSitemapPaths(catalog) {
  const lists = (catalog?.listas ?? []).filter(item => item.activa !== false && safeSlug(item.slug));
  const allowed = new Set(lists.map(item => item.id));
  const products = (catalog?.productos ?? []).filter(item =>
    item.activo === true && item.es_prueba !== true && allowed.has(item.lista_id) && safeId(item.id));
  return [...new Set([
    '/', '/como-comparamos', '/aviso-afiliados', '/metodologia',
    ...lists.map(item => '/lista/' + safeSegment(item.slug)),
    ...products.map(item => '/producto/' + safeSegment(item.id)),
  ])];
}

export function renderSitemapXml(paths) {
  const urls = paths.map(path => {
    const url = new URL(path, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) throw new Error('URL fuera del dominio oficial');
    return '  <url><loc>' + xmlEscape(url.href) + '</loc></url>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls + '\n</urlset>';
}
