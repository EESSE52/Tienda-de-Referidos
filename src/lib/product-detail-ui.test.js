import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const detail = readFileSync(new URL('../pages/producto/[id].astro', import.meta.url), 'utf8');

describe('ficha de producto legible', () => {
  it('muestra etiquetas y unidades configuradas en vez de claves técnicas', () => {
    expect(detail).toContain('field: lista?.campos.find');
    expect(detail).toContain('field?.etiqueta || key');
    expect(detail).toContain('field?.unidad || ""');
  });
  it('evita recortar imágenes de productos', () => {
    expect(detail).toContain('object-contain p-4');
    expect(detail).toContain('getPublicProductImage(producto)');
  });
});
