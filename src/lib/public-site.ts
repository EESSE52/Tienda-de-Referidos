import type { Producto } from './catalog';
import { dateLabel } from './format';

export const MOSTRAR_IMAGENES_ML = false;

export const AVISO_AFILIADOS_BREVE = 'Este sitio usa enlaces de afiliado de Mercado Libre; podemos recibir una comision sin costo extra para ti.';

export function getGenericImageByListId(listaId: string): string {
  if (listaId === 'creatina') return '/img/generica-creatina.svg';
  if (listaId === 'proteina') return '/img/generica-proteina.svg';
  return '/img/generica-producto.svg';
}

export function getPublicProductImage(producto: Producto): string {
  if (producto.imagen_propia) {
    return producto.imagen_propia;
  }

  if (MOSTRAR_IMAGENES_ML && producto.imagen_candidata) {
    return producto.imagen_candidata;
  }

  return getGenericImageByListId(producto.lista_id);
}

export function getPrecioReferencialLabel(fechaPrecio?: string): string {
  return `Precio referencial al ${dateLabel(fechaPrecio)}.`;
}
