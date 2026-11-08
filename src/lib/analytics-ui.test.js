import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
describe('Fase 6: instrumentación y tablero', () => {
  it('mide vistas de producto y clics sin reemplazar la URL de afiliado', () => {
    const layout = read('src/layouts/Layout.astro');
    const product = read('src/pages/producto/[id].astro');
    const category = read('src/pages/lista/[slug].astro');
    const comparison = read('src/pages/comparador.astro');
    expect(layout).toContain("navigator.sendBeacon('/api/analytics/event'");
    expect(layout).toContain("send('view'");
    expect(layout).toContain("send('affiliate_click'");
    expect(product).toContain('data-product-view={producto.id}');
    expect(product).toContain('href={producto.enlace_referido} data-affiliate-product={producto.id}');
    expect(product).toContain('href={offer.enlace_referido} data-affiliate-product={offer.id}');
    expect(category).toContain('data-affiliate-placement="category_card"');
    expect(comparison).toContain('data-affiliate-placement="comparison"');
  });
  it('protege las estadísticas en la API administrativa y mantiene fallos inocuos', () => {
    const adminApi = read('src/pages/api/admin/analytics.ts');
    const eventApi = read('src/pages/api/analytics/event.ts');
    expect(adminApi).toContain('requireAdmin({ env, request })');
    expect(adminApi).toContain('displayAnalytics');
    expect(eventApi).toContain('validateAnalyticsEvent(data)');
    expect(eventApi).toContain('status: 204');
    expect(eventApi).not.toContain('cookies.');
  });
  it('activa enlaces reales de la barra lateral hacia todos los módulos', () => {
    const admin = read('public/admin/index.html');
    const sections = [
      ['analytics-dashboard-panel', 'Inteligencia comercial'],
      ['products-panel', 'Productos'],
      ['offer-management-panel', 'Vendedores y ofertas'],
      ['price-management-panel', 'Control de precios'],
      ['import-panel', 'Importar productos'],
      ['categories-panel', 'Categorías'],
      ['settings-panel', 'Configuración'],
    ];
    for (const [id, label] of sections) {
      expect(admin).toContain('href="#' + id + '" data-admin-nav>' + label + '</a>');
      expect(admin).toMatch(new RegExp('<section[^>]*id="' + id + '"'));
    }
    expect(admin).not.toContain('<a href="#">Dashboard</a>');
    expect(admin).toContain("window.addEventListener('hashchange', selectActive)");
    expect(admin).toContain("link.setAttribute('aria-current', 'location')");
    expect(admin).toContain('position: sticky;');
  });
  it('permite ordenar por visitas, clics, CTR y oportunidades sin modificar D1', () => {
    const admin = read('public/admin/index.html');
    for (const mode of ['visitas', 'clics', 'ctr', 'opportunity']) {
      expect(admin).toContain('<option value="' + mode + '">');
    }
    expect(admin).toContain('id="analytics-sort"');
    expect(admin).toContain('function renderAnalyticsSnapshot(result)');
    expect(admin).toContain('analyticsSort.addEventListener');
    expect(admin).toContain('const analyticsCtr = item =>');
    expect(admin).toContain('views >= 10 ? analyticsCtr(item) : -1');
  });
  it('muestra estadísticas separadas de ventas y comisiones', () => {
    const admin = read('public/admin/index.html');
    expect(admin).toContain('id="analytics-dashboard-panel"');
    expect(admin).toContain('function analyticsTable(title, rows, columns)');
    expect(admin).toContain("api('/api/admin/analytics?days='");
    expect(admin).toContain('Los clics no equivalen a ventas');
    expect(admin).toContain('Rendimiento por vendedor (clics, no ventas)');
  });
});
