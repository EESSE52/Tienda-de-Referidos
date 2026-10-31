import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { normalizeImportedRow } from './admin-server.mjs';

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return { status: response.status, text };
}

async function waitForServer(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetchText(`http://127.0.0.1:${port}/admin`);
      if (response.status === 200) return response;
    } catch (error) {
      // Espera a que arranque el servidor.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Servidor del admin no disponible en el puerto ${port}`);
}

describe('Admin server - importación', () => {
  it('normaliza encabezados de Excel reales como Nombre del producto y Enlace / URL', () => {
    const row = normalizeImportedRow({
      'Nombre del producto': 'Creatina Monohidratada',
      'Precio CLP': '24990',
      'Enlace / URL': 'https://example.com/producto',
      Lista: 'creatina',
      Marca: 'PowerLab',
      Activo: 'true',
    });

    expect(row.nombre).toBe('Creatina Monohidratada');
    expect(row.precio).toBe(24990);
    expect(row.enlace_referido).toBe('https://example.com/producto');
    expect(row.lista_id).toBe('creatina');
    expect(row.activo).toBe(true);
  });

  it('normaliza encabezados alternativos (Producto, URL, Precio)', () => {
    const row = normalizeImportedRow({
      Producto: 'Whey Protein',
      URL: 'https://example.com/whey',
      Precio: '29990',
      Lista: 'proteinas',
    });

    expect(row.nombre).toBe('Whey Protein');
    expect(row.enlace_referido).toBe('https://example.com/whey');
    expect(row.precio).toBe(29990);
    expect(row.lista_id).toBe('proteinas');
  });

  it('admin local sirve XLSX local para importar Excel sin depender del CDN', async () => {
    const port = 43199 + Math.floor(Math.random() * 1000);
    const child = spawn(process.execPath, ['scripts/admin-server.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, ADMIN_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    try {
      const home = await waitForServer(port);
      expect(home.status).toBe(200);
      expect(home.text).toMatch(/\/admin\/vendor\/xlsx\.full\.min\.js/);

      const xlsx = await fetchText(`http://127.0.0.1:${port}/admin/vendor/xlsx.full.min.js`);
      expect(xlsx.status).toBe(200);
      expect(xlsx.text).toMatch(/XLSX|sheet_to_json/i);
    } finally {
      child.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }, 20000);
});
