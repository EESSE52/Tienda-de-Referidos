import { describe, expect, it } from 'vitest';
import { buildMercadoLibreReviewCsv } from '../../public/admin/bulk-csv.js';

const category = {
  id: 'creatina',
  campos: [
    { clave: 'gramos_total', tipo: 'numero' },
    { clave: 'porciones', tipo: 'numero' },
    { clave: 'gramos_total', tipo: 'numero' },
    { clave: '../mal', tipo: 'texto' },
  ],
};
const product = {
  name: 'Creatina 300g', brand: 'Marca',
  id_publicacion: 'MLC1234567890',
  price: 17990,
  url_publicacion: 'https://articulo.mercadolibre.cl/MLC-1234567890',
  image: 'https://example.com/creatina.jpg',
  attributes: { gramos_total: 300, porciones: 60 },
};

describe('descarga CSV de revisión Mercado Libre', () => {
  it('genera productos inactivos, sin declarar enlaces de afiliado verificados', () => {
    const csv = buildMercadoLibreReviewCsv(category, [product]);
    expect(csv).toContain('"activo","es_prueba","gramos_total","porciones"');
    expect(csv).toContain('"false","false","300","60"');
    expect(csv).toContain('"https://articulo.mercadolibre.cl/MLC-1234567890"');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).not.toContain('../mal');
  });
  it('escapa comillas y fórmulas peligrosas para Excel', () => {
    const csv = buildMercadoLibreReviewCsv(category, [{
      ...product, name: '=IMPORTXML("https://example.com")',
      brand: '-cmd',
    }]);
    expect(csv).toContain('"' + "'=IMPORTXML");
    expect(csv).toContain('"' + "'-cmd");
    expect(csv).toContain('""https://example.com""');
  });
  it('rechaza precios inválidos y publicaciones que no sean de Chile', () => {
    expect(() => buildMercadoLibreReviewCsv(category, [{ ...product, price: 0 }])).toThrow();
    expect(() => buildMercadoLibreReviewCsv(category, [{ ...product, url_publicacion: 'https://evil.com/MLC1234567890' }])).toThrow();
    expect(() => buildMercadoLibreReviewCsv(category, [{ ...product, id_publicacion: 'MLA1234567890' }])).toThrow();
  });
  it('limita el lote y exige una categoría válida', () => {
    expect(() => buildMercadoLibreReviewCsv(category, [])).toThrow();
    expect(() => buildMercadoLibreReviewCsv(category, Array(11).fill(product))).toThrow();
    expect(() => buildMercadoLibreReviewCsv({ id: '../hack' }, [product])).toThrow();
  });
});
