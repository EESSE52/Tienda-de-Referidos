import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../pages/index.astro', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../layouts/Layout.astro', import.meta.url), 'utf8');

describe('Rediseño deportivo D’MonkeySport: portada y mascota', () => {
  it('presenta el lema deportivo y botones con destinos reales', () => {
    expect(home).toContain('Entrena como');
    expect(home).toContain('un Mono!');
    expect(home).toContain('href="#categorias"');
    expect(home).toContain('href="/como-comparamos"');
    expect(home).toContain('id="categorias"');
  });
  it('muestra la mascota optimizada y conserva el texto accesible del encabezado', () => {
    expect(home).toContain('/img/dmonkeysport-mascota.webp');
    expect(home).toContain('aria-labelledby="hero-title"');
    expect(layout).toContain('aria-label="D’MonkeySport, ir al inicio"');
    expect(layout).toContain('id="mobile-nav"');
  });
  it('mantiene categorías reales sin generar un catálogo ficticio', () => {
    expect(home).toContain('listaCards.map((lista)');
    expect(home).toContain('href={`/lista/${lista.slug}`}');
    expect(home).toContain('Explorar categoría');
  });
  it('mantiene SEO, enlaces de afiliados y estadísticas', () => {
    expect(layout).toContain('property="og:title"');
    expect(layout).toContain("send('affiliate_click'");
    expect(home).toContain('selectPopularProducts(');
    expect(home).toContain('selectPriceDrops(');
  });
});
