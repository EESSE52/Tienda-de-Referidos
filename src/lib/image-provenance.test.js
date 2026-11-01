import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normaliseProductPayload, validateProductPayload } from './admin-validacion.js';
import { getPublicProductImage } from './public-site';

const admin = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
const base = {
  lista_id: 'creatina', nombre: 'Creatina 60 gomitas',
  precio: 19990, activo: false,
  enlace_referido: 'https://meli.la/2ATCSzi',
  url_publicacion: 'https://www.mercadolibre.cl/creatina/up/MLCU3220313328#wid=MLC2908577036',
};

describe('trazabilidad de fotografías candidatas', () => {
  it('preserva URL de imagen y origen por separado del enlace afiliado', () => {
    const saved = validateProductPayload({
      ...base,
      imagen_candidata: 'https://http2.mlstatic.com/D_NQ_NP_2X_675192-MLC93031993450_092025-F-creatina.webp',
      imagen_origen_url: base.url_publicacion,
    });
    expect(saved.imagen_origen_url).toBe(base.url_publicacion);
    expect(saved.enlace_referido).toBe(base.enlace_referido);
    expect(getPublicProductImage(saved)).toBe('/img/generica-creatina.svg');
  });
  it('mantiene candidata al editar sin reemplazar foto autorizada', () => {
    const before = normaliseProductPayload({
      ...base, id: 'producto-1',
      imagen_candidata: 'https://http2.mlstatic.com/image.webp',
      imagen_propia: 'https://fotos.example/autorizada.webp',
      imagen_fuente: 'autorizada',
      imagen_origen_url: base.url_publicacion,
    });
    const after = validateProductPayload({ ...before, precio: 18000 }, [before], before.id);
    expect(after.imagen_candidata).toBe(before.imagen_candidata);
    expect(after.imagen_propia).toBe(before.imagen_propia);
    expect(getPublicProductImage(after)).toBe('https://fotos.example/autorizada.webp');
  });
  it('no permite URLs candidatas sin HTTPS', () => {
    expect(() => validateProductPayload({ ...base, imagen_candidata: 'http://http2.mlstatic.com/foto.webp' }))
      .toThrow('HTTPS');
  });
  it('el editor muestra trazabilidad y no publica la candidata', () => {
    expect(admin).toContain('name="imagen_candidata"');
    expect(admin).toContain('name="imagen_origen_url"');
    expect(admin).toContain('updateCandidateImageSummary()');
    expect(admin).toContain('imagen_candidata: item.image');
    expect(admin).toContain("enlace_referido: ''");
  });
});
