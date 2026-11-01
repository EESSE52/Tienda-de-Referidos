import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('editor de categorías de distintas presentaciones', () => {
  const html = readFileSync(new URL('../../public/admin/index.html', import.meta.url), 'utf8');
  it('permite elegir la categoría y el campo a modificar', () => {
    expect(html).toContain('id="category-field-form"');
    expect(html).toContain('function renderCategoryFieldOptions()');
    expect(html).toContain('renderCategoryFieldValues()');
  });
  it('envía los cambios de formato y obligatoriedad a PATCH autenticado', () => {
    expect(html).toContain("method: 'PATCH'");
    expect(html).toContain('categoryFieldForm.elements.requerido.checked');
    expect(html).toContain("field.tipo === 'seleccion'");
  });
  it('no altera el formulario de características de productos', () => {
    expect(html).toContain('id="ml-manual-attributes"');
    expect(html).toContain('function renderManualAttributes()');
  });
});
