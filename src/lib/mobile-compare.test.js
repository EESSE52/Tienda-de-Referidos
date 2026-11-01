import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pages = new URL('../pages/', import.meta.url);
const list = readFileSync(new URL('lista/[slug].astro', pages), 'utf8');
const compare = readFileSync(new URL('comparador.astro', pages), 'utf8');

describe('comparación móvil de productos', () => {
  it('muestra barra de selección con contador, chips y botones accesibles', () => {
    for (const id of ['compare-tray', 'compare-count', 'compare-chips', 'compare-clear', 'compare-link']) {
      expect(list).toContain('id="' + id + '"');
    }
    expect(list).toContain('aria-label={`Comparar ${producto.nombre}`}');
  });
  it('limita a 4 y exige al menos 2 productos antes de comparar', () => {
    expect(list).toContain('if (selected.size >= 4)');
    expect(list).toContain('if (selected.size < 2) event.preventDefault()');
    expect(list).toContain("ids.length >= 2 ? '/comparador?ids='");
  });
  it('permite quitar elementos individuales y limpiar la selección', () => {
    expect(list).toContain("chip.addEventListener('click'");
    expect(list).toContain("compareClear.addEventListener('click'");
    expect(list).toContain('compareChips.replaceChildren()');
  });
  it('mejora la navegación horizontal de la comparación y muestra links de oferta', () => {
    expect(compare).toContain('aria-label="Tabla comparativa; desliza horizontalmente para ver más productos"');
    expect(compare).toContain('sticky left-0');
    expect(compare).toContain('href={producto.enlace_referido}');
    expect(compare).toContain('rel="sponsored nofollow noopener"');
  });
});
