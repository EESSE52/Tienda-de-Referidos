import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const admin = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
const listing = readFileSync(new URL('../pages/lista/[slug].astro', import.meta.url), 'utf8');

describe('administración y listado de múltiples ofertas', () => {
  it('permite crear grupos y vendedores explícitos desde administración', () => {
    expect(admin).toContain('name="grupo_ofertas"');
    expect(admin).toContain('name="vendedor_nombre"');
    expect(admin).toContain('name="id_catalogo"');
    expect(admin).toContain("'vendedor_nombre','grupo_ofertas','id_catalogo'");
  });
  it('ofrece un panel de vendedores en D1 con filtros y revisión individual', () => {
    expect(admin).toContain('id="offer-management-panel"');
    expect(admin).toContain('id="offers-category-filter"');
    expect(admin).toContain('id="offers-search"');
    expect(admin).toContain('id="offers-status-filter"');
    expect(admin).toContain('function renderOfferDashboard()');
    expect(admin).toContain('offerDashboard.replaceChildren()');
    expect(admin).toContain("edit.addEventListener('click', () => startEditingOffer(offer))");
    expect(admin).toContain("review.addEventListener('click', () => reviewPrice(offer.id))");
    expect(admin).toContain('offerSummary.textContent = currentProducts.length');
    expect(admin).toContain('renderOfferDashboard();');
  });
  it('agrupa solo con identificadores explícitos y nunca por nombre comercial', () => {
    expect(admin).toContain("return product.lista_id + ':manual:' + group");
    expect(admin).toContain("product.lista_id + ':catalog:' + catalogId");
    expect(admin).toContain("product.lista_id + ':single:' + product.id");
    expect(admin).toContain("offer.es_prueba === true ? 'PRUEBA'");
    expect(admin).toContain('Diferencia entre precios activos registrados (sin envío)');
  });
  it('muestra un producto por grupo y anuncia las publicaciones asociadas', () => {
    expect(listing).toContain('getGroupedListingProducts(catalog.getProductosByListaId(lista.id))');
    expect(listing).toContain('getOffersForProduct(producto, catalog.productos).length');
    expect(listing).toContain('ofertas de vendedores');
  });
});
