import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const script = readFileSync(new URL('../../scripts/prepare-oauth-preview.mjs', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
const statusRoute = readFileSync(new URL('../pages/api/admin/mercadolibre/oauth/status.ts', import.meta.url), 'utf8');
const startRoute = readFileSync(new URL('../pages/api/admin/mercadolibre/oauth/start.ts', import.meta.url), 'utf8');

describe('preparación de OAuth aislado de producción', () => {
  it('usa nombre distinto y prepara configuración sin desplegar', () => {
    expect(script).toContain("config.name = 'tienda-de-referidos-oauth-pruebas'");
    expect(script).toContain('wrangler.oauth-preview.json');
    expect(script).not.toContain('wrangler deploy');
  });
  it('elimina los enlaces con bases y rutas productivas', () => {
    for (const item of ['d1_databases', 'kv_namespaces', 'r2_buckets', 'routes', 'route', 'vars']) {
      expect(script).toContain('delete config.' + item + ';');
    }
  });
  it('requiere autorización del administrador para inicio y estado', () => {
    expect(startRoute).toContain('requireAdmin({ env, request })');
    expect(statusRoute).toContain('requireAdmin({ env, request })');
  });
  it('muestra el botón OAuth y permite conexión administrativa sin D1 solo cuando el modo de pruebas está listo', () => {
    expect(admin).toContain('id="ml-oauth-test-start"');
    expect(admin).toContain("api('/api/admin/mercadolibre/oauth/start', { method: 'POST' })");
    expect(admin).toContain("api('/api/admin/mercadolibre/oauth/status')");
    expect(admin).toContain('status.oauth_pruebas === true');
  });
});
