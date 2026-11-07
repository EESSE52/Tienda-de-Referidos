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
    expect(script).toContain('config.keep_vars = true');
  });
  it('elimina los enlaces con bases y rutas productivas', () => {
    for (const item of ['d1_databases', 'kv_namespaces', 'r2_buckets', 'routes', 'route', 'vars']) {
      expect(script).toContain('delete config.' + item + ';');
    }
  });
  it('solo añade almacenamiento KV con un identificador introducido explícitamente', () => {
    expect(script).toContain('ML_OAUTH_KV_NAMESPACE_ID');
    expect(script).toContain("binding: 'ML_OAUTH_TOKENS'");
    expect(script).toContain("if (!/^[a-f0-9]{32}$/i.test(kvId))");
  });
  it('requiere autorización del administrador para inicio y estado', () => {
    expect(startRoute).toContain('requireAdmin({ env, request })');
    expect(statusRoute).toContain('requireAdmin({ env, request })');
  });
  it('muestra el botón OAuth y permite conexión administrativa sin D1 solo cuando el modo de pruebas está listo', () => {
    expect(admin).toContain('id="ml-oauth-test-start"');
    expect(admin).toContain("api('/api/admin/mercadolibre/oauth/start', { method: 'POST' })");
    expect(admin).toContain("api('/api/admin/mercadolibre/oauth/status')");
    // La conexión al catálogo D1 no depende del estado OAuth.
    expect(admin).toContain("await refresh();");
    expect(admin).toContain("await refreshCategories();");
    expect(admin).toContain("message(adminStatus, 'Conectado a D1. Productos: '");
    expect(admin).toContain("No fue posible conectar al catálogo:");
    // OAuth se consulta solo mediante su endpoint protegido y se rechaza
    // explícitamente cuando el Worker de pruebas no está habilitado.
    expect(admin).toContain("if (!info.oauth_pruebas) throw new Error(");
    expect(admin).toContain("if (!result.authorization_url) throw new Error(");
  });
});
