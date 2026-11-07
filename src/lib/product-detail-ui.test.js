import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const detail = readFileSync(new URL('../pages/producto/[id].astro', import.meta.url), 'utf8');

describe('ficha de producto legible', () => {
  it('muestra etiquetas y unidades configuradas en vez de claves técnicas', () => {
    expect(detail).toContain('field: lista?.campos.find');
    expect(detail).toContain('field?.etiqueta || key');
    expect(detail).toContain('field?.unidad || ""');
  });
  it('destaca costos unitarios con precisión sin confundirlos con el precio total', () => {
    expect(detail).toContain('mainCostMetrics');
    expect(detail).toContain('metricDisplay(metrica, metrica.valor)');
    expect(detail).toContain('currencyCLPUnit(value)');
    expect(detail).toContain('Costos unitarios del producto');
    expect(detail).toContain('Precio referencial registrado');
  });
  it('protege la compra en ofertas inactivas y explica la falta de verificación', () => {
    expect(detail).toContain('hasAffiliateLink && isPublicOffer');
    expect(detail).toContain('rel="sponsored nofollow noopener"');
    expect(detail).toContain('Oferta no disponible para compra desde aquí');
    expect(detail).toContain('Disponibilidad sin verificar');
    expect(detail).toContain('Imagen genérica de la categoría');
  });
  it('compara publicaciones de distintos vendedores sin confundir precios con valores actuales', () => {
    expect(detail).toContain('getOffersForProduct(producto, catalog.productos)');
    expect(detail).toContain('Ofertas de vendedores');
    expect(detail).toContain('Menor precio registrado');
    expect(detail).toContain('Disponibilidad no confirmada');
    expect(detail).toContain('Diferencia entre precios registrados');
    expect(detail).toContain('sin costos de envío');
  });
  it('evita recortar imágenes de productos', () => {
    expect(detail).toContain('object-contain p-4');
    expect(detail).toContain('getPublicProductImage(producto)');
  });
});
