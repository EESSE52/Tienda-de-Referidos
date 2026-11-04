import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ruta administrativa Mercado Libre', () => {
  it('conserva ID catálogo y prioriza la oferta wid en formulario y diagnóstico', () => {
    const route = readFileSync(new URL('../pages/api/mercadolibre.ts', import.meta.url), 'utf8');
    const admin = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
    expect(route).toContain('source.catalogId');
    expect(admin).toContain('fragment.get(\'wid\')');
    expect(admin).toContain('id_catalogo: item.id_catalogo');
  });
  it('usa el resolvedor asíncrono para enlaces meli.la', () => {
    const source = readFileSync(new URL('../pages/api/mercadolibre.ts', import.meta.url), 'utf8');
    expect(source).toContain("import { resolveChileMercadoLibreUrl }");
    expect(source).toContain("await resolveChileMercadoLibreUrl(productUrl)");
    expect(source).not.toContain("const source = normalizeChileMercadoLibreUrl(productUrl)");
  });
});
