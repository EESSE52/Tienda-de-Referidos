// Funciones de cálculo. No redondean: el redondeo se hace solo al mostrar.
// Si falta un dato o hay división por cero, devuelven null (la interfaz muestra "—").

export interface DatosCalculo {
  precio?: number | null;
  porciones?: number | null;
  contenido_g?: number | null;
  proteina_por_porcion_g?: number | null;
}

export type Metricas = Record<string, number | null>;

const esNumero = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Divide a / b; devuelve null si falta un dato o el divisor no es positivo. */
export function dividir(a: unknown, b: unknown): number | null {
  if (!esNumero(a) || !esNumero(b) || b <= 0) return null;
  return a / b;
}

export const precioPorPorcion = (precio: unknown, porciones: unknown) => dividir(precio, porciones);

export const precioPorGramo = (precio: unknown, contenidoG: unknown) => dividir(precio, contenidoG);

/** Precio de una dosis de `dosisG` gramos, calculado desde el precio por gramo. */
export function precioPorDosis(precio: unknown, contenidoG: unknown, dosisG: number): number | null {
  const porGramo = precioPorGramo(precio, contenidoG);
  return porGramo === null ? null : porGramo * dosisG;
}

/** precio / (porciones * proteína por porción). */
export function precioPorGramoProteina(precio: unknown, porciones: unknown, proteinaPorPorcionG: unknown): number | null {
  if (!esNumero(porciones) || !esNumero(proteinaPorPorcionG)) return null;
  return dividir(precio, porciones * proteinaPorPorcionG);
}

/** Todas las métricas de un producto; las que no aplican o no se pueden calcular son null. */
export function calcularMetricas(p: DatosCalculo): Metricas {
  return {
    precio_por_porcion: precioPorPorcion(p.precio, p.porciones),
    precio_por_gramo: precioPorGramo(p.precio, p.contenido_g),
    precio_por_dosis_3g: precioPorDosis(p.precio, p.contenido_g, 3),
    precio_por_dosis_5g: precioPorDosis(p.precio, p.contenido_g, 5),
    precio_por_gramo_proteina: precioPorGramoProteina(p.precio, p.porciones, p.proteina_por_porcion_g),
  };
}
