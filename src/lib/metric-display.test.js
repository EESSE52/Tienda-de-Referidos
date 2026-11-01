import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = new URL('../pages/', import.meta.url);
const list = readFileSync(new URL('lista/[slug].astro', base), 'utf8');
const compare = readFileSync(new URL('comparador.astro', base), 'utf8');
const detail = readFileSync(new URL('producto/[id].astro', base), 'utf8');

describe('presentación de métricas no disponibles', () => {
  it('no muestra cifras inventadas en la lista, comparación ni ficha', () => {
    expect(list).toContain("return 'No disponible'");
    expect(compare).toContain("return 'No disponible'");
    expect(detail).toContain("return 'No disponible'");
  });
  it('ordena valores desconocidos al final también en orden descendente', () => {
    expect(list).toContain('if (aValue === null) return bValue === null ? 0 : 1;');
    expect(list).toContain('if (bValue === null) return -1;');
  });
  it('no resalta ganador de métricas entre diferentes categorías', () => {
    expect(compare).toContain('mixedLists.size === 1');
    expect(compare).toContain('const bestValue = compatible ?');
  });
});
