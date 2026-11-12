import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { identifyManualSource } from '../../public/admin/manual-source.js';

describe('Extractor inteligente: recuperación manual asistida', () => {
  const kiffer = 'https://www.mercadolibre.cl/creatina-monohidratada-creapure-kiffer-labs-x-series-en-polvo-de-400g/p/MLC53674200?pdp_filters=item_id%3AMLC3027701274#source=lists&wid=MLC3027701274&sid=storefronts';
  it('identifica catálogo y oferta sin perder el enlace de origen', () => {
    expect(identifyManualSource(kiffer)).toEqual({
      url:kiffer, id_publicacion:'MLC3027701274', id_catalogo:'MLC53674200', short:false,
    });
  });
  it('identifica oferta MLCU solo cuando aparece wid verificable', () => {
    expect(identifyManualSource('https://www.mercadolibre.cl/creatina/up/MLCU3220313328#wid=MLC2908577036'))
      .toMatchObject({id_publicacion:'MLC2908577036',id_catalogo:''});
    expect(identifyManualSource('https://www.mercadolibre.cl/creatina/up/MLCU3220313328'))
      .toMatchObject({id_publicacion:'',id_catalogo:''});
  });
  it('no finge identificar producto al recibir un enlace meli.la', () => {
    expect(identifyManualSource('https://meli.la/2fhCazH')).toEqual({
      url:'https://meli.la/2fhCazH', id_publicacion:'',id_catalogo:'',short:true,
    });
  });
  it('bloquea orígenes maliciosos o URLs no seguras', () => {
    for (const url of [
      'https://www.mercadolibre.cl.evil.example/p/MLC53674200',
      'http://www.mercadolibre.cl/p/MLC53674200',
      'https://user:password@www.mercadolibre.cl/p/MLC53674200',
      'javascript:alert(1)',
    ]) expect(() => identifyManualSource(url)).toThrow();
  });
  it('mantiene la API, el analizador de texto y la revisión previa en D1', () => {
    const html = readFileSync(new URL('../../public/admin/index.html',import.meta.url),'utf8');
    expect(html).toContain("api('/api/mercadolibre?url=' + encodeURIComponent(url))");
    expect(html).toContain('function prepareManualFallback(rawUrl)');
    expect(html).toContain('manualButton.textContent = \'Preparar ingreso manual\'');
    expect(html).toContain("import('/admin/manual-source.js')");
    expect(html).toContain("import('/admin/pasted-specs.js')");
    expect(html).toContain('id="ml-pasted-apply"');
    expect(html).toContain('id="ml-batch-preview-d1"');
    expect(html).toContain('id="ml-batch-save-d1"');
    expect(html).toContain("document.getElementById('ml-manual-affiliate').value = ''");
  });
});
