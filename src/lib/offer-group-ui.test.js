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
  it('prepara ofertas nuevas inactivas sin copiar enlaces ni precios ajenos', () => {
    expect(admin).toContain('Preparar nueva oferta para este producto');
    expect(admin).toContain('form.elements.activo.checked = false');
    expect(admin).toContain("form.elements.precio.value = ''");
    expect(admin).toContain("form.elements.id_publicacion.value = ''");
    expect(admin).toContain("form.elements.enlace_referido.value = ''");
    expect(admin).toContain("form.elements.url_publicacion.value = ''");
    expect(admin).toContain("renderProductFields(reference.atributos || {})");
    expect(admin).toContain("document.getElementById('product-form-title').textContent = 'Preparar oferta nueva (inactiva)'");
  });
  it('agrupa solo con identificadores explícitos y nunca por nombre comercial', () => {
    expect(admin).toContain("return product.lista_id + ':manual:' + group");
    expect(admin).toContain("product.lista_id + ':catalog:' + catalogId");
    expect(admin).toContain("product.lista_id + ':single:' + product.id");
    expect(admin).toContain("offer.es_prueba === true ? 'PRUEBA'");
    expect(admin).toContain('Diferencia entre precios activos registrados (sin envío)');
  });
  it('abre publicación oficial para comprobar precio manual sin modificar D1', () => {
    expect(admin).toContain('function officialPriceUrl(product)');
    expect(admin).toContain('function createOfficialPriceLink(product)');
    expect(admin).toContain("host === 'mercadolibre.cl' || host.endsWith('.mercadolibre.cl')");
    expect(admin).toContain("url.protocol === 'https:'");
    expect(admin).toContain("product.es_prueba === true");
    expect(admin).toContain("https://articulo.mercadolibre.cl/MLC-");
    expect(admin).toContain("link.target = '_blank'");
    expect(admin).toContain("link.rel = 'noopener noreferrer'");
    expect(admin).toContain('Ver precio en Mercado Libre ↗');
    expect(admin).toContain('if (publicationLink) actions.appendChild(publicationLink)');
    expect(admin).toContain('if (publicationLink) div.appendChild(publicationLink)');
    expect(admin).toContain('if (publicationLink) {');
    expect(admin).toContain('reviewDetails.appendChild(publicationLink)');
  });
  it('muestra un producto por grupo y anuncia las publicaciones asociadas', () => {
    expect(listing).toContain('getGroupedListingProducts(catalog.getProductosByListaId(lista.id))');
    expect(listing).toContain('getOffersForProduct(producto, catalog.productos).length');
    expect(listing).toContain('ofertas de vendedores');
  });
});
