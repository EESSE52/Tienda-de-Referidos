import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getPublicProductImage } from './public-site';

const page = readFileSync(new URL('../pages/lista/[slug].astro', import.meta.url), 'utf8');
const desktop = page.slice(page.indexOf('aria-label="Catálogo de productos;'), page.indexOf('<div id="empty-state"'));
const mobile = page.slice(page.indexOf('<section id="productos"'), page.indexOf('<div class="lg:mt-0'));

describe('Miniaturas de productos en catálogo público', () => {
  it('agrega columna Imagen con una miniatura enlazada de 64 píxeles por fila', () => {
    expect(desktop).toContain('>Imagen</th>');
    expect(desktop).toContain('aria-label={`Ver ficha de ${producto.nombre}`}');
    expect(desktop).toContain('src={getPublicProductImage(producto)}');
    expect(desktop).toContain('width="64" height="64"');
    expect(desktop).toContain('object-contain');
    expect(desktop).toContain('loading="lazy" decoding="async"');
  });
  it('conserva miniatura móvil, selección y acceso comercial sin alterar enlaces afiliados', () => {
    expect(mobile).toContain('src={getPublicProductImage(producto)}');
    expect(desktop).toContain('class="compare-toggle');
    expect(desktop).toContain('href={producto.enlace_referido}');
    expect(desktop).toContain('data-affiliate-placement="category_table"');
  });
  it('usa imagen autorizada o genérica, nunca la candidata sin permiso', () => {
    const product = { lista_id: 'proteina', imagen_candidata: 'https://mercadolibre.example/photo.jpg' };
    expect(getPublicProductImage(product)).toBe('/img/generica-proteina.svg');
    expect(getPublicProductImage({...product, imagen_propia:'https://photos.example/authorized.webp'}))
      .toBe('https://photos.example/authorized.webp');
  });
});
