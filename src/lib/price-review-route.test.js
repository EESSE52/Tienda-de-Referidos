import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync(new URL('../pages/api/admin/products/[id]/price-review.ts', import.meta.url), 'utf8');

describe('errores de consulta a Mercado Libre', () => {
  it('explica acceso denegado 401/403 sin publicar precios supuestos', () => {
    expect(route).toContain('ML_API_ACCESS_DENIED');
    expect(route).toContain('No se cambió ningún precio');
    expect(route).toContain('Editar oferta');
    expect(route).toContain('}, 424)');
  });
  it('conserva revisión con autenticación y confirmación explícita', () => {
    expect(route).toContain('requireAdmin({ env, request })');
    expect(route).toContain('previewPriceChange(env, params.id');
    expect(route).toContain('confirmPriceChange(env, params.id');
  });
});
