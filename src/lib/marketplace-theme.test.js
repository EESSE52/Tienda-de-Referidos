import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../../' + path, import.meta.url),'utf8');

describe('Identidad visual D’MonkeySport: amarillo y azul', () => {
  it('define acentos azules para los componentes existentes del catálogo', () => {
    const css = read('src/styles/global.css');
    expect(css).toContain('--color-emerald-600: #2563eb');
    expect(css).toContain('--color-emerald-700: #1d4ed8');
    expect(css).toContain('--dm-yellow: #ffe600');
    expect(css).toContain('--dm-page: #f5f5f5');
    expect(css).not.toContain('background: #00a650');
  });
  it('pinta la navegación superior amarilla sin perder el menú móvil', () => {
    const layout = read('src/layouts/Layout.astro');
    expect(layout).toContain('bg-[#ffe600]');
    expect(layout).toContain('text-[#172554]');
    expect(layout).toContain('id="mobile-nav"');
    expect(layout).toContain('aria-label="Navegación móvil"');
    expect(layout).toContain('href="/#categorias"');
  });
  it('presenta una portada amarilla con texto oscuro y CTA azul', () => {
    const home = read('src/pages/index.astro');
    expect(home).toContain('bg-[#ffe600]');
    expect(home).toContain('text-black'); // Título negro del nuevo diseño deportivo.
    expect(home).toContain('bg-[#2563eb]');
    expect(home).toContain('D’MonkeySport');
    expect(home).not.toContain('from-emerald-500 to-teal-700');
  });
  it('mantiene comparador, fichas, filtros y seguimiento de afiliados', () => {
    const layout = read('src/layouts/Layout.astro');
    const list = read('src/pages/lista/[slug].astro');
    const detail = read('src/pages/producto/[id].astro');
    expect(layout).toContain("send('affiliate_click'");
    expect(layout).toContain("send('view'");
    expect(list).toContain('id="search-input"');
    expect(detail).toContain('data-product-view={producto.id}');
    expect(detail).toContain('href={producto.enlace_referido} data-affiliate-product={producto.id}');
  });
});
