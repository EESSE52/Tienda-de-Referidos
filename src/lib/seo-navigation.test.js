import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { publicSitemapPaths, renderSitemapXml, SITE_ORIGIN } from './seo-sitemap.js';

const read = path => readFileSync(new URL(path, new URL('../../', import.meta.url)), 'utf8');

describe('Fase 7.9: indexación SEO y navegación móvil', () => {
  const catalog = {
    listas: [
      {id:'creatina',slug:'creatina',activa:true},
      {id:'oculta',slug:'oculta',activa:false},
      {id:'invalida',slug:'a&b',activa:true},
    ],
    productos: [
      {id:'MLC1234567',lista_id:'creatina',activo:true,es_prueba:false},
      {id:'FICTICIO',lista_id:'creatina',activo:true,es_prueba:true},
      {id:'INACTIVO',lista_id:'creatina',activo:false},
      {id:'OTRO',lista_id:'oculta',activo:true},
      {id:'A&B',lista_id:'creatina',activo:true},
    ],
  };
  it('publica solo categorías y productos visibles, nunca artículos de prueba', () => {
    const paths = publicSitemapPaths(catalog);
    expect(paths).toContain('/lista/creatina');
    expect(paths).toContain('/producto/MLC1234567');
    for (const value of ['FICTICIO','INACTIVO','OTRO','a&b','A&B']) {
      expect(paths.join('|')).not.toContain(value);
    }
    expect(paths).not.toContain('/comparador');
    expect(new Set(paths).size).toBe(paths.length);
  });
  it('genera XML con URLs del dominio real y sin rutas ajenas', () => {
    const xml = renderSitemapXml(publicSitemapPaths(catalog));
    expect(xml).toContain('<loc>https://dmonkeysport.com/producto/MLC1234567</loc>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).not.toContain('.example');
    expect(SITE_ORIGIN).toBe('https://dmonkeysport.com');
    expect(() => renderSitemapXml(['https://malicioso.example/'])).toThrow('fuera del dominio');
  });
  it('robots.txt apunta al sitemap correcto y restringe rutas administrativas', () => {
    const robots = read('src/pages/robots.txt.ts');
    expect(robots).toContain('Sitemap: ${SITE_ORIGIN}/sitemap.xml');
    expect(robots).toContain('Disallow: /admin/');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).not.toContain('dmonkesport.example');
  });
  it('agrega canonicals estables y metadatos de vista previa', () => {
    const layout=read('src/layouts/Layout.astro');
    expect(layout).toContain("new URL(currentPath, 'https://dmonkeysport.com')");
    expect(layout).toContain('<link rel="canonical" href={canonicalUrl} />');
    expect(layout).toContain('property="og:title"');
    expect(layout).toContain('property="og:description"');
    expect(layout).toContain("D’MonkeySport");
    expect(read('src/pages/comparador.astro')).toContain('noindex={true}');
  });
  it('muestra navegación accesible en móvil con enlace a categorías', () => {
    const layout=read('src/layouts/Layout.astro');
    const home=read('src/pages/index.astro');
    expect(layout).toContain('id="mobile-nav"');
    expect(layout).toContain('aria-label="Navegación móvil"');
    expect(layout).toContain('href="/#categorias"');
    expect(home).toContain('id="categorias"');
  });
});
