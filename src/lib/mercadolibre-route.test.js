import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ruta administrativa Mercado Libre', () => {
  it('usa el resolvedor asíncrono para enlaces meli.la', () => {
    const source = readFileSync(new URL('../pages/api/mercadolibre.ts', import.meta.url), 'utf8');
    expect(source).toContain("import { resolveChileMercadoLibreUrl }");
    expect(source).toContain("await resolveChileMercadoLibreUrl(productUrl)");
    expect(source).not.toContain("const source = normalizeChileMercadoLibreUrl(productUrl)");
  });
});
