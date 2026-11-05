import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { validateOcrPhoto, recognizeProductPhoto } from '../../public/admin/photo-ocr.js';
import { previewPastedSpecifications } from '../../public/admin/pasted-specs.js';

const file = (type='image/jpeg',size=1024)=>({type,size});
describe('OCR de fotografías en catálogo manual', () => {
  it('acepta fotos comunes y rechaza SVG u otros archivos y tamaños excesivos', () => {
    expect(validateOcrPhoto(file())).toBe(true);
    expect(validateOcrPhoto(file('image/png'))).toBe(true);
    expect(validateOcrPhoto(file('image/webp'))).toBe(true);
    expect(() => validateOcrPhoto(file('image/svg+xml'))).toThrow('JPG, PNG o WEBP');
    expect(() => validateOcrPhoto(file('image/jpeg', 11*1024*1024))).toThrow('10 MB');
    expect(() => validateOcrPhoto(null)).toThrow('Selecciona');
  });
  it('extrae texto y cierra el worker OCR sin enviar la foto al servidor', async () => {
    const terminate = vi.fn().mockResolvedValue();
    const recognize = vi.fn().mockResolvedValue({data:{text:'Marca Ostrovit\nPeso neto 500 g',confidence:93.2}});
    const createWorker = vi.fn().mockResolvedValue({recognize,terminate});
    const result = await recognizeProductPhoto(file(),()=>{},{engine:{createWorker}});
    expect(createWorker.mock.calls[0][0]).toEqual(['spa','eng']);
    expect(recognize).toHaveBeenCalledWith(file());
    expect(terminate).toHaveBeenCalledOnce();
    expect(result).toEqual({text:'Marca Ostrovit\nPeso neto 500 g',confidence:93.2});
  });
  it('termina el worker aunque falle reconocimiento', async () => {
    const terminate = vi.fn().mockResolvedValue();
    await expect(recognizeProductPhoto(file(),()=>{},{engine:{
      createWorker:vi.fn().mockResolvedValue({recognize:vi.fn().mockRejectedValue(new Error('lectura fallida')),terminate}),
    }})).rejects.toThrow('lectura fallida');
    expect(terminate).toHaveBeenCalledOnce();
  });
  it('interpreta el texto de OCR sin dos puntos usando los campos de categoría', () => {
    const result = previewPastedSpecifications(
      'Marca Ostrovit\nPeso neto 500 g\nCantidad de porciones 200\nSabor Sandía',
      {campos:[
        {clave:'gramos_total',etiqueta:'Gramos totales',tipo:'numero'},
        {clave:'porciones',etiqueta:'Porciones',tipo:'numero'},
        {clave:'sabor',etiqueta:'Sabor',tipo:'texto'},
      ]});
    expect(result.brand).toBe('Ostrovit');
    expect(result.mapped).toEqual({gramos_total:500,porciones:200,sabor:'Sandía'});
  });
  it('incluye controles y reusa revisión manual sin guardar por OCR', () => {
    const html=readFileSync(new URL('../../public/admin/index.html', import.meta.url),'utf8');
    const ocr=readFileSync(new URL('../../public/admin/photo-ocr.js',import.meta.url),'utf8');
    expect(html).toContain('id="ml-ocr-image"');
    expect(html).toContain('id="ml-ocr-read"');
    expect(html).toContain("import('/admin/photo-ocr.js')");
    expect(html).toContain("textField.dispatchEvent(new Event('input'");
    expect(ocr).not.toContain('/api/admin/products');
    expect(ocr).toContain('cdn.jsdelivr.net/npm/tesseract.js@5.1.1');
  });
});
