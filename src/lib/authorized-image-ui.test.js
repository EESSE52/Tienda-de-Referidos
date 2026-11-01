import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const admin = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');

describe('interfaz de imágenes autorizadas', () => {
  it('ofrece URL de imagen pública y declaración de derechos', () => {
    expect(admin).toContain('name="imagen_propia"');
    expect(admin).toContain('name="imagen_autorizada_confirmada"');
    expect(admin).toContain('id="product-image-preview"');
    expect(admin).toContain('No uses imágenes de Mercado Libre sin permiso');
  });
  it('muestra vista previa sin guardar ni consultar imágenes por servidor', () => {
    expect(admin).toContain('function showAuthorizedImagePreview()');
    expect(admin).toContain('imagePreview.appendChild(img)');
  });
  it('envía autorización explícita al guardar y conserva imagen en edición', () => {
    expect(admin).toContain('body.imagen_autorizada_confirmada = form.elements.imagen_autorizada_confirmada.checked');
    expect(admin).toContain("'imagen_propia']");
  });
});
