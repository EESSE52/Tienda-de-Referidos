import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeGoogleDriveImageUrl, isGoogleDriveImageLink } from '../../public/admin/drive-image-url.js';
import { validateProductPayload } from './admin-validacion.js';
import { getPublicProductImage } from './public-site';

const id = '1K38WI-wHvpIUzjY0I27BvHwENRSq9Um1';
const output = 'https://lh3.googleusercontent.com/d/' + id + '=w1200';
const base = { lista_id:'creatina', nombre:'Ejemplo producto',precio:14990, activo:false, enlace_referido:'https://meli.la/2ATCSzi' };

describe('Imágenes autorizadas desde Google Drive', () => {
  it('convierte enlaces de compartir a imágenes públicas de 1200px', () => {
    expect(normalizeGoogleDriveImageUrl('https://drive.google.com/file/d/' + id + '/view?usp=sharing')).toBe(output);
    expect(normalizeGoogleDriveImageUrl('https://drive.google.com/open?id=' + id)).toBe(output);
    expect(normalizeGoogleDriveImageUrl('https://drive.google.com/uc?export=view&id=' + id)).toBe(output);
  });
  it('normaliza enlaces directos y elimina el parámetro authuser', () => {
    expect(normalizeGoogleDriveImageUrl(output + '?authuser=0')).toBe(output);
    expect(normalizeGoogleDriveImageUrl('https://lh3.googleusercontent.com/d/' + id + '=w900?authuser=0')).toBe(output);
    expect(isGoogleDriveImageLink(output)).toBe(true);
  });
  it('mantiene imágenes autorizadas de otros servidores y rechaza enlaces inseguros de Drive', () => {
    expect(normalizeGoogleDriveImageUrl('https://images.example/imagen.webp')).toBe('https://images.example/imagen.webp');
    for (const url of ['http://drive.google.com/file/d/' + id + '/view','https://drive.google.com/drive/folders/' + id,'https://drive.google.com/file/d/invalido/view','https://usuario:clave@drive.google.com/open?id=' + id])
      expect(() => normalizeGoogleDriveImageUrl(url)).toThrow();
  });
  it('exige autorización antes de publicar y no modifica el enlace de afiliado', () => {
    const input = { ...base, imagen_propia:'https://drive.google.com/file/d/' + id + '/view?usp=sharing' };
    expect(() => validateProductPayload(input)).toThrow('autorización');
    const saved = validateProductPayload({ ...input, imagen_autorizada_confirmada:true });
    expect(saved.imagen_propia).toBe(output);
    expect(saved.enlace_referido).toBe(base.enlace_referido);
    expect(getPublicProductImage(saved)).toBe(output);
  });
  it('conserva imagen aprobada al editar y ofrece conversión y vista previa en el formulario', () => {
    const existing = validateProductPayload({ ...base, id:'one', imagen_propia:output, imagen_autorizada_confirmada:true });
    expect(validateProductPayload({...existing, precio:12990},[existing],existing.id).imagen_propia).toBe(output);
    const html = readFileSync(new URL('../../public/admin/index.html',import.meta.url),'utf8');
    expect(html).toContain("import { normalizeGoogleDriveImageUrl, isGoogleDriveImageLink } from './drive-image-url.js'");
    expect(html).toContain('id="drive-image-status"');
    expect(html).toContain('function normalizeAuthorizedImageInput()');
    expect(html).toContain('body.imagen_propia = normalizeGoogleDriveImageUrl(body.imagen_propia)');
    expect(html).toContain('function showAuthorizedImagePreview()');
  });
});
