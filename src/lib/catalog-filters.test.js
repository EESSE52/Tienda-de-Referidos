import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const list = readFileSync(new URL('../pages/lista/[slug].astro', import.meta.url), 'utf8');

describe('Fase 7.5: filtros y experiencia de comparación', () => {
  it('permite filtrar por marca y por intervalo de precios registrados', () => {
    for (const id of ['brand-filter', 'price-min', 'price-max']) {
      expect(list).toContain('id="' + id + '"');
    }
    expect(list).toContain("data-brand-value={producto.marca || ''}");
    expect(list).toContain('row.dataset.brandValue !== brand');
    expect(list).toContain('price < minPrice');
    expect(list).toContain('price > maxPrice');
  });
  it('mantiene búsqueda y filtros por atributos existentes', () => {
    expect(list).toContain('id="search-input"');
    expect(list).toContain('data-filter-field={campo.clave}');
    expect(list).toContain("filters.forEach((field) => {");
    expect(list).toContain('searchInput?.addEventListener');
  });
  it('actualiza tarjetas móviles y contador después de cada filtro', () => {
    expect(list).toContain('card.classList.toggle(\'hidden\', !visible)');
    expect(list).toContain('row.style.display = visible');
    expect(list).toContain('id="filter-count"');
    expect(list).toContain('filterCount.textContent = visibleCount');
    expect(list).toContain('applyFilters();\n\n    syncCompare();');
  });
  it('limpia todos los filtros sin borrar la selección de comparación', () => {
    expect(list).toContain('id="reset-filters"');
    expect(list).toContain("resetFilters?.addEventListener('click'");
    expect(list).toContain("if (brandFilter) brandFilter.value = ''");
    expect(list).toContain("if (priceMin) priceMin.value = ''");
    expect(list).toContain("if (priceMax) priceMax.value = ''");
    const resetBlock=list.split("resetFilters?.addEventListener('click'")[1].split('});')[0];
    expect(resetBlock).not.toContain('selected.clear()');
  });
});
