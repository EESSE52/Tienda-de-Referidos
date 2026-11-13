/**
 * Perfil reutilizable de vitaminas y minerales.
 * Los mg de sales o el peso del contenido de una cápsula NO representan
 * necesariamente la dosis del mineral elemental. Solo aceptar información
 * nutricional declarada, sin inferencias del nombre del producto.
 */
export function vitaminsCategoryProfile() {
  const numeric = (clave, etiqueta, unidad) => ({
    clave, etiqueta, tipo:'numero', unidad, mejor:'mayor',
    en_tabla:true, filtrable:false, requerido:false,
  });
  const selection = (clave, etiqueta, opciones) => ({
    clave, etiqueta, tipo:'seleccion', unidad:null, opciones, mejor:null,
    en_tabla:true, filtrable:true, requerido:false,
  });
  const text = (clave, etiqueta, inTable = false) => ({
    clave, etiqueta, tipo:'texto', unidad:null, mejor:null,
    en_tabla:inTable, filtrable:false, requerido:false,
  });
  const ratio = (clave, etiqueta, campo) => ({
    clave, etiqueta, plantilla:{tipo:'precio_dividido_por',campo},
    formula:{tipo:'precio_dividido_por',campo},
    mejor:'menor',decimales:2,
  });
  return {
    id:'vitaminas', slug:'vitaminas', nombre:'Vitaminas y minerales',
    descripcion:'Compara vitaminas, minerales y combinaciones como ZMA. Prioriza precio por porción y unidad; las cantidades de nutrientes se registran solo cuando están declaradas en la etiqueta.',
    activa:true, unidad_base:'ud',
    orden_defecto:{campo:'precio_por_porcion',direccion:'menor'},
    campos:[
      selection('tipo_suplemento','Tipo de suplemento',['Vitamina','Mineral','Multivitamínico','Vitaminas y minerales','Combinación ZMA','Otro']),
      selection('formato','Presentación',['Cápsulas','Tabletas','Polvo','Gomitas','Gotas','Líquido','Otro']),
      numeric('cantidad_unidades','Unidades por envase','ud'),
      numeric('porciones','Porciones por envase','ud'),
      numeric('unidades_por_porcion','Unidades por porción','ud'),
      numeric('gramos_total','Peso neto total','g'),
      numeric('peso_por_porcion_mg','Peso de la porción','mg'),
      numeric('zinc_elemental_mg','Zinc elemental por porción','mg'),
      numeric('magnesio_elemental_mg','Magnesio elemental por porción','mg'),
      numeric('vitamina_b6_mg','Vitamina B6 por porción','mg'),
      numeric('vitamina_c_mg','Vitamina C por porción','mg'),
      numeric('vitamina_d_ug','Vitamina D por porción','µg'),
      text('ingredientes','Ingredientes'),
      text('sabor','Sabor'),
    ],
    metricas:[
      ratio('precio_por_porcion','Precio por porción','porciones'),
      ratio('precio_por_unidad','Precio por cápsula / unidad','cantidad_unidades'),
    ],
    mapa_atributos_ml:{
      BRAND:{campo:'marca',conversion:'texto'},
      UNITS_PER_PACKAGE:{campo:'cantidad_unidades',conversion:'numero'},
      SERVINGS_NUMBER:{campo:'porciones',conversion:'numero'},
      NET_WEIGHT:{campo:'gramos_total',conversion:'peso_a_gramos'},
      FLAVOR:{campo:'sabor',conversion:'texto'},
    },
  };
}
