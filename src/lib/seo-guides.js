import { parseVisual } from './seo-visual.js';
// Guías originales, redactadas como material educativo, sin precios ni beneficios inventados.
export const starterGuides = [
  {
    slug: 'mejor-creatina-chile',
    title: '¿Qué creatina conviene comprar en Chile?',
    description: 'Aprende a comparar creatinas por tipo, gramos, dosis declarada y costo real antes de comprar en Chile.',
    category: 'Creatina',
    listSlug: 'creatina',
    updatedAt: '2026-11-15',
    paragraphs: [
      'Para elegir una creatina conviene comprobar primero la variedad declarada, la cantidad neta y la información de la etiqueta. El precio del envase, por sí solo, no permite saber qué presentación resulta más económica.',
      'En productos comparables que contienen creatina monohidratada, calcula el precio registrado por gramo dividiendo el precio por los gramos totales. Si hay porciones definidas, revisa también el costo por porción, sin asumir que todas las marcas usan la misma cantidad.',
      'Compara solamente formatos equivalentes: polvo sin ingredientes adicionales con polvo similar. Cápsulas, gomitas y mezclas pueden tener cantidades de creatina diferentes por unidad.',
      'Comprueba fecha del precio, disponibilidad, cantidad final y costo de despacho en la tienda. D’MonkeySport presenta información referencial y enlaces a terceros, no garantiza un precio de venta final.'
    ]
  },
  {
    slug: 'creatina-300-vs-500',
    title: 'Creatina de 300 g vs. 500 g: ¿qué formato conviene?',
    description: 'Método para comparar creatinas de 300 y 500 gramos mediante precio por gramo y costo por porción.',
    category: 'Creatina',
    listSlug: 'creatina',
    updatedAt: '2026-11-15',
    paragraphs: [
      'Un envase de 500 gramos cuesta más que uno de 300 gramos en muchos casos, pero eso no significa que sea menos conveniente. Para comparar, calcula el precio por gramo de ambos envases.',
      'Ejemplo ilustrativo: si 300 gramos cuestan $18.000, cada gramo cuesta $60. Si 500 gramos cuestan $25.000, cada gramo cuesta $50. En ese ejemplo, el envase de 500 gramos cuesta menos por gramo, aunque requiere una compra inicial mayor.',
      'Además del precio unitario, considera despacho, fechas de vencimiento, composición declarada y si realmente consumirás el contenido antes de su vencimiento.',
      'En el comparador revisa los valores actuales registrados y entra en la publicación del vendedor para verificar el total antes de pagar.'
    ]
  },
  {
    slug: 'comparar-proteinas-whey',
    title: 'Cómo comparar proteínas whey sin fijarse solo en el envase',
    description: 'Compara proteínas whey por gramos de proteína declarados, porciones y costo de cada porción.',
    category: 'Proteínas',
    listSlug: 'proteina',
    updatedAt: '2026-11-15',
    paragraphs: [
      'Dos proteínas en polvo pueden mostrar el mismo peso neto y diferentes cantidades de proteína por porción. Para comparar correctamente, lee la tabla nutricional de cada producto.',
      'Calcula el costo por porción dividiendo el precio entre la cantidad de porciones declaradas. Cuando sea posible, calcula el costo por gramo de proteína declarado, usando el contenido proteico por porción multiplicado por el número de porciones.',
      'Comprueba que las porciones, sabores y formatos sean comparables. La denominación whey concentrada, aislada o mezcla indica composiciones distintas; no conviene compararlas únicamente por el precio total.',
      'El valor del comparador es orientativo. Confirma etiqueta, precio y stock en la publicación original antes de comprar.'
    ]
  },
  {
    slug: 'como-elegir-suplementos',
    title: 'Cómo comparar suplementos deportivos antes de comprar',
    description: 'Guía práctica para interpretar precio por unidad, ingredientes, formatos y vigencia de los precios.',
    category: 'Consejos de compra',
    listSlug: 'creatina',
    updatedAt: '2026-11-15',
    paragraphs: [
      'Antes de comprar un suplemento, define qué característica necesitas comparar: peso neto, unidades, concentración declarada o tamaño de porción. No todos los productos de una categoría son equivalentes.',
      'El costo unitario se calcula dividiendo el precio entre la cantidad de referencia, por ejemplo gramos o cápsulas. Para productos de composiciones diferentes, revisa también la cantidad de ingrediente declarada por unidad.',
      'Revisa la información del vendedor, vigencia del precio, gastos de envío, condiciones de devolución y etiquetado. Nunca interpretes un precio registrado como garantía de disponibilidad.',
      'Las guías de D’MonkeySport son informativas y no sustituyen la orientación individualizada de profesionales de salud cuando sea necesaria.'
    ]
  },
  {
    slug: 'comparar-zma-vitaminas',
    title: 'ZMA, vitaminas y minerales: cómo comparar cápsulas y precios',
    description: 'Qué revisar al comparar ZMA, vitaminas y minerales: cantidad de cápsulas, dosis declarada e ingredientes.',
    category: 'Vitaminas y minerales',
    listSlug: 'vitaminas',
    updatedAt: '2026-11-15',
    paragraphs: [
      'Al comparar productos ZMA o suplementos de vitaminas y minerales, no basta con contar cápsulas. Revisa la cantidad declarada de cada ingrediente por porción y cuántas cápsulas componen esa porción.',
      'Calcula el costo por porción según las indicaciones del envase y verifica las unidades de medida del etiquetado. Dos productos pueden usar formulaciones distintas y no deben tratarse como equivalentes únicamente por el nombre.',
      'Compara cantidad de unidades, composición, advertencias de etiqueta, precio registrado y costo de envío. Evita elegir solamente por una declaración publicitaria.',
      'D’MonkeySport no emite recomendaciones clínicas ni indica dosis personales. Verifica siempre la información de la tienda antes de realizar la compra.'
    ]
  }
];
export const validGuideSlug = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug ?? ''));
export const guideFallback = slug => starterGuides.find(g => g.slug === slug);
export async function getPublishedGuides(db) {
  let overrides = [];
  try {
    if (db?.prepare) {
      const response = await db.prepare("SELECT slug,title,description,category,list_slug AS listSlug,body,status,updated_at AS updatedAt,editor_json AS editorJson FROM seo_articles ORDER BY updated_at DESC").all();
      overrides = (response.results ?? []).map(row => ({...row, paragraphs: String(row.body ?? '').split(/\n\s*\n/).filter(Boolean), visual: parseVisual(row.editorJson)}));
    }
  } catch { /* Instalación pendiente: las guías iniciales siguen disponibles */ }
  const result = new Map(starterGuides.map(g => [g.slug,g]));
  for (const override of overrides) if(validGuideSlug(override.slug)) {
    if (override.status === 'draft') result.delete(override.slug);
    else result.set(override.slug,override);
  }
  return [...result.values()];
}
