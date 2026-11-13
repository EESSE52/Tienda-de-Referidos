import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const admin = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
describe('listado D1: categoría, procedencia y contraste', () => {
  it('incluye filtro de categoría y contador de resultados', () => {
    expect(admin).toContain('id="product-category-filter"');
    expect(admin).toContain('id="product-origin-filter"');
    expect(admin).toContain('id="product-list-count"');
    expect(admin).toContain("productCategoryFilter.addEventListener('change', () => renderProducts())");
  });
  it('filtra categoría y procedencia combinadas conservando todas las categorías', () => {
    expect(admin).toContain("(originFilter.value === 'todos' || originStatus(p) === originFilter.value)");
    expect(admin).toContain("(productCategoryFilter.value === 'todos' || p.lista_id === productCategoryFilter.value)");
    expect(admin).toContain("all.textContent = 'Todas las categorías'");
    expect(admin).toContain("productCategoryFilter.value = ids.includes(previous) ? previous : 'todos'");
  });
  it('mantiene selección de lotes y acciones de editar, historial y desactivar', () => {
    expect(admin).toContain('selectedBatchIds.has(product.id)');
    expect(admin).toContain('startEditingOffer(product)');
    expect(admin).toContain('showPriceHistory(product.id)');
    expect(admin).toContain("disable.textContent = 'Desactivar'");
  });
  it('aplica estilos exclusivos al panel de productos', () => {
    expect(admin).toContain('#products-panel .product-list-filters select');
    expect(admin).toContain('#products-panel #product-list input[type=checkbox]');
    expect(admin).toContain('#products-panel #product-list .admin-actions button.secondary');
    expect(admin).toContain('#products-panel #product-list .admin-actions .product-action-disable');
  });
});