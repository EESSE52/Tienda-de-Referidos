import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('../pages/lista/[slug].astro', import.meta.url), 'utf8');

describe('tarjetas móviles del catálogo', () => {
  it('incluye imágenes seguras y precios referenciales', () => {
    expect(page).toContain('getPublicProductImage(producto)');
    expect(page).toContain('currencyCLP(producto.precio)');
    expect(page).toContain('getPrecioReferencialLabel(producto.fecha_precio)');
    expect(page).toContain('loading="lazy"');
  });
  it('permite abrir producto y usar únicamente enlace de afiliado', () => {
    expect(page).toContain('href={producto.enlace_referido}');
    expect(page).toContain('rel="sponsored nofollow noopener"');
    expect(page).toContain('Oferta pendiente');
  });
  it('sincroniza selección de tarjetas y tabla', () => {
    expect(page).toContain("const cards = Array.from(document.querySelectorAll('[data-card]'))");
    expect(page).toContain('toggle.checked = selected.has(toggle.value)');
    expect(page).toContain("if (toggle.value === id) toggle.checked = false");
  });
  it('respeta el orden y los filtros en tarjetas móviles', () => {
    expect(page).toContain('card.style.order = String(order.get(card.dataset.productId)');
    expect(page).toContain("card.classList.toggle('hidden', !visible)");
    expect(page).toContain('id="productos"');
  });
});
