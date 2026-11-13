/**
 * Perfil para aminoácidos y derivados (lisina, NAC y glutamina).
 * Las métricas por gramo se aplican solo a productos con peso declarado;
 * nunca se equipara peso de cápsulas con ingrediente activo.
 */
export function aminoCategoryProfile(existing) {
  if (!existing || existing.id !== 'amino' || existing.slug !== 'amino') {
    throw new Error('Solo se puede configurar la categoría amino.');
  }
  const numeric = (clave, etiqueta, unidad, requerido = false) => ({
    clave, etiqueta, tipo: 'numero', unidad, mejor: 'mayor',
    en_tabla: true, filtrable: false, requerido,
  });
  const select = (clave, etiqueta, opciones) => ({
    clave, etiqueta, tipo:'seleccion', unidad:null, opciones,
    mejor:null, en_tabla:true, filtrable:true, requerido:false,
  });
  const free = (clave, etiqueta) => ({
    clave, etiqueta, tipo:'texto', unidad:null,
    mejor:null, en_tabla:true, filtrable:false, requerido:false,
  });
  const metric = (clave, etiqueta, campo) => ({
    clave, etiqueta,
    plantilla:{ tipo:'precio_dividido_por', campo },
    formula:{ tipo:'precio_dividido_por', campo },
    mejor:'menor', decimales:2,
  });
  return {
    ...existing,
    nombre:'Aminoácidos',
    descripcion:'Comparador de lisina, NAC, glutamina y otros aminoácidos: precio por porción, cápsula o gramo cuando corresponde. No compara ingredientes activos distintos como equivalentes.',
    activa:true,
    unidad_base:'ud',
    orden_defecto:{campo:'precio_por_porcion',direccion:'menor'},
    campos:[
      select('ingrediente','Ingrediente principal',['L-lisina','NAC','L-glutamina','BCAA','EAA','Otro']),
      select('formato','Presentación',['Polvo','Cápsulas','Tabletas','Gomitas','Líquido','Otro']),
      numeric('gramos_total','Peso neto de polvo','g'),
      numeric('cantidad_unidades','Unidades en envase','ud'),
      numeric('porciones','Porciones por envase','ud'),
      numeric('mg_activo_por_porcion','Ingrediente activo por porción','mg'),
      free('sabor','Sabor'),
    ],
    metricas:[
      metric('precio_por_porcion','Precio por porción','porciones'),
      metric('precio_por_unidad','Precio por cápsula / unidad','cantidad_unidades'),
      metric('precio_por_gramo','Precio por gramo de producto en polvo','gramos_total'),
    ],
    mapa_atributos_ml:{
      BRAND:{campo:'marca',conversion:'texto'},
      NET_WEIGHT:{campo:'gramos_total',conversion:'peso_a_gramos'},
      SERVINGS_NUMBER:{campo:'porciones',conversion:'numero'},
      FLAVOR:{campo:'sabor',conversion:'texto'},
    },
  };
}
