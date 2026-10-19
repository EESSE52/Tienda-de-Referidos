// Configuración de categorías.
// Para agregar una categoría nueva basta con editar este archivo y data/productos.json.

export interface CampoExtra {
  clave: string;
  etiqueta: string;
  /** Si hay opciones, el campo solo admite esos valores. */
  opciones?: string[];
  requerido?: boolean;
}

/** Formatos de visualización: texto, CLP sin decimales, CLP con 1 decimal, número. */
export type FormatoColumna = 'texto' | 'clp' | 'clp1' | 'num';

export interface Columna {
  /** Campo del producto o métrica calculada (ver src/lib/calculos.ts). */
  clave: string;
  etiqueta: string;
  formato: FormatoColumna;
  ordenable?: boolean;
}

export interface Categoria {
  slug: string;
  nombre: string;
  descripcion: string;
  camposExtra: CampoExtra[];
  columnas: Columna[];
  /** Clave de la columna con la que se ordena por defecto (de menor a mayor). */
  ordenPorDefecto: string;
  /** Campo extra usado como filtro de "tipo". */
  filtroTipo: string;
}

export const categorias: Categoria[] = [
  {
    slug: 'creatina',
    nombre: 'Creatina',
    descripcion: 'Comparación de creatinas por precio, porción y precio por dosis.',
    camposExtra: [
      { clave: 'tipo', etiqueta: 'Tipo', opciones: ['monohidrato', 'micronizada', 'HCl', 'otro'], requerido: true },
      { clave: 'certificacion', etiqueta: 'Certificación' },
    ],
    columnas: [
      { clave: 'nombre', etiqueta: 'Producto', formato: 'texto' },
      { clave: 'marca', etiqueta: 'Marca', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Tipo', formato: 'texto' },
      { clave: 'precio', etiqueta: 'Precio', formato: 'clp', ordenable: true },
      { clave: 'precio_por_porcion', etiqueta: 'Por porción', formato: 'clp', ordenable: true },
      { clave: 'precio_por_gramo', etiqueta: 'Por gramo', formato: 'clp1', ordenable: true },
      { clave: 'precio_por_dosis_3g', etiqueta: 'Por dosis 3 g', formato: 'clp1', ordenable: true },
      { clave: 'precio_por_dosis_5g', etiqueta: 'Por dosis 5 g', formato: 'clp1', ordenable: true },
    ],
    ordenPorDefecto: 'precio_por_gramo',
    filtroTipo: 'tipo',
  },
  {
    slug: 'proteina',
    nombre: 'Proteína',
    descripcion: 'Comparación de proteínas por precio, porción y precio por gramo de proteína.',
    camposExtra: [
      { clave: 'tipo', etiqueta: 'Tipo', opciones: ['whey concentrada', 'aislada', 'vegetal', 'otro'], requerido: true },
      { clave: 'proteina_por_porcion_g', etiqueta: 'Proteína por porción (g)', requerido: true },
    ],
    columnas: [
      { clave: 'nombre', etiqueta: 'Producto', formato: 'texto' },
      { clave: 'marca', etiqueta: 'Marca', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Tipo', formato: 'texto' },
      { clave: 'precio', etiqueta: 'Precio', formato: 'clp', ordenable: true },
      { clave: 'precio_por_porcion', etiqueta: 'Por porción', formato: 'clp', ordenable: true },
      { clave: 'precio_por_gramo', etiqueta: 'Por gramo', formato: 'clp1', ordenable: true },
      { clave: 'precio_por_gramo_proteina', etiqueta: 'Por g de proteína', formato: 'clp1', ordenable: true },
    ],
    ordenPorDefecto: 'precio_por_gramo_proteina',
    filtroTipo: 'tipo',
  },
];

export function categoriaPorSlug(slug: string): Categoria | undefined {
  return categorias.find((c) => c.slug === slug);
}
