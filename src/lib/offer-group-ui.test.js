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
  it('muestra un producto por grupo y anuncia las publicaciones asociadas', () => {
    expect(listing).toContain('getGroupedListingProducts(catalog.getProductosByListaId(lista.id))');
    expect(listing).toContain('getOffersForProduct(producto, catalog.productos).length');
    expect(listing).toContain('ofertas de vendedores');
  });
});
