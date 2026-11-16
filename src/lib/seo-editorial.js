// Contenido complementario editorial, independiente del precio cambiante del catálogo.
// Evita afirmaciones terapéuticas y recomendaciones de dosis personales.
export const editorialExtras = {
  'mejor-creatina-chile': {
    takeaway: 'La comparación más útil es entre productos de composición equivalente y usando el costo por gramo, no solo el valor del envase.',
    sections: [
      {heading:'Qué revisar antes de comparar', points:[
        'Tipo indicado en la etiqueta: monohidrato, mezcla o producto con ingredientes adicionales.',
        'Cantidad neta del producto en gramos y número de porciones declaradas.',
        'Fecha del precio registrado y costo de despacho indicado al finalizar la compra.',
        'Datos del vendedor, rotulación, fecha de vencimiento e información de ingredientes.'
      ]},
      {heading:'Cómo calcular el costo unitario', paragraphs:[
        'Ejemplo hipotético: envase A de 300 g a $18.000 = $60 por gramo. Envase B de 500 g a $25.000 = $50 por gramo. En este caso B cuesta menos por gramo, pero requiere más presupuesto inicial.',
        'El cálculo sirve si ambos son productos comparables. Si incluyen otros ingredientes o tienen distintas concentraciones declaradas, revisa la composición antes de sacar conclusiones.'
      ]},
      {heading:'Errores habituales de compra', points:[
        'Elegir automáticamente el envase con el precio más bajo sin revisar su tamaño.',
        'Comparar polvo, gomitas y cápsulas como si contuvieran lo mismo.',
        'Olvidar envío, condiciones de devolución y vigencia del precio.'
      ]}
    ],
    faqs: [
      {q:'¿La creatina más cara es necesariamente mejor?',a:'No se puede deducir la calidad solo del precio. Compara composición, etiquetado, origen y documentación disponible.'},
      {q:'¿D’MonkeySport vende directamente el producto?',a:'No. Ofrece información comparativa y enlaces hacia la tienda del vendedor, donde se confirma el valor final.'}
    ]
  },
  'creatina-300-vs-500': {
    takeaway: 'El formato de 500 g puede resultar más económico por gramo, pero no siempre: depende del precio final y del producto exacto.',
    sections: [
      {heading:'Ejemplo comparativo con cifras ilustrativas', example:[
        {name:'Envase A', amount:'300 g', price:'$18.000', perUnit:'$60/g'},
        {name:'Envase B', amount:'500 g', price:'$25.000', perUnit:'$50/g'}
      ], paragraphs:['Con estos valores inventados únicamente para explicar el cálculo, el envase B ofrece un precio unitario 16,7% menor. Los valores reales cambian por marca, tienda y fecha.']},
      {heading:'Factores que modifican la decisión',points:[
        'Presupuesto disponible hoy y diferencia en desembolso inicial.',
        'Despacho, promociones y restricciones de la publicación.',
        'Fecha de vencimiento y cantidad que realmente se utilizará.',
        'Diferencias de composición entre los productos.'
      ]},
      {heading:'Fórmula para comparar',paragraphs:[
        'Precio por gramo = precio total registrado ÷ gramos netos. Si deseas comparar costo por porción, usa la cantidad de producto por porción que declara cada etiqueta.'
      ]}
    ],
    faqs:[{q:'¿Siempre conviene el envase grande?',a:'No. Si el descuento por gramo es pequeño, el envío es más caro o no necesitas la cantidad adicional, el formato pequeño puede ser más conveniente.'}]
  },
  'comparar-proteinas-whey': {
    takeaway:'El peso del tarro no equivale al contenido total de proteína: compara los gramos de proteína declarados y el costo asociado.',
    sections:[
      {heading:'Tres métricas para elegir con información',points:[
        'Gramos de proteína declarados por porción, según la tabla nutricional.',
        'Número de porciones y peso neto del producto.',
        'Costo por porción y costo aproximado por gramo de proteína declarada.'
      ]},
      {heading:'Ejemplo de cálculo',paragraphs:[
        'Ejemplo hipotético: un producto de $36.000 declara 30 porciones con 24 g de proteína cada una. El envase declara 720 g de proteína en total (30 × 24). El costo calculado es $1.200 por porción y $50 por gramo de proteína declarado.',
        'Estos números no representan un producto real del catálogo. Para comparaciones válidas, verifica el etiquetado específico de cada presentación y sabor.'
      ]},
      {heading:'Diferencias que importan',points:[
        'Concentrado, aislado y mezclas tienen formulaciones distintas; revisa la tabla de cada envase.',
        'El tamaño de porción cambia entre marcas y sabores.',
        'Comprueba alérgenos, ingredientes y restricciones pertinentes antes de comprar.',
        'Confirma precio y gastos de envío en la tienda de destino.'
      ]}
    ],
    faqs:[{q:'¿Una proteína de 1 kg aporta 1 kg de proteína?',a:'No necesariamente. El peso neto incluye todos los ingredientes; para estimar la cantidad de proteína utiliza la información nutricional declarada.'}]
  },
  'como-elegir-suplementos': {
    takeaway:'Compara productos equivalentes, define una unidad de referencia y comprueba la información del vendedor antes de pagar.',
    sections:[
      {heading:'Lista de verificación antes de comprar',points:[
        'Identifica el ingrediente o atributo específico que quieres comparar.',
        'Comprueba peso neto, unidades, porciones y concentración declarada.',
        'Calcula costo unitario y confirma fecha de actualización del precio.',
        'Revisa características, vendedor, políticas de devolución y despacho.',
        'Verifica el precio final en la tienda; el comparador no realiza el cobro.'
      ]},
      {heading:'Qué significa comparar por unidad',paragraphs:[
        'En polvo, el precio por gramo ayuda a comparar presentaciones equivalentes. En cápsulas, el precio por cápsula puede ser útil si el contenido por cápsula coincide. Cuando cambia la concentración, es mejor comparar el contenido declarado del ingrediente de interés.',
        'Un costo unitario más bajo no demuestra por sí mismo mayor calidad, adecuación personal ni un beneficio para la salud.'
      ]},
      {heading:'Cómo usar D’MonkeySport',points:[
        'Abre una categoría y revisa las fichas activas.',
        'Selecciona productos comparables y usa las métricas disponibles.',
        'Comprueba el registro de precio y abre la publicación comercial antes de decidir.'
      ]}
    ],
    faqs:[{q:'¿Los precios del comparador son ofertas garantizadas?',a:'No. Son registros referenciales que pueden cambiar. Siempre confirma disponibilidad, despacho y precio final en la tienda.'}]
  },
  'comparar-zma-vitaminas': {
    takeaway:'No basta con contar cápsulas: compara composición declarada por porción, cantidad de porciones y advertencias de la etiqueta.',
    sections:[
      {heading:'Datos que conviene leer en la etiqueta',points:[
        'Ingredientes y cantidad declarada de cada mineral o vitamina por porción.',
        'Número de cápsulas por porción, cápsulas totales y porciones por envase.',
        'Unidad de medida indicada: por ejemplo mg o µg, evitando confundirlas.',
        'Advertencias, ingredientes adicionales, fecha de vencimiento y vendedor.'
      ]},
      {heading:'Ejemplo de costo por porción',paragraphs:[
        'Ejemplo hipotético: un frasco cuesta $15.000 e indica 90 cápsulas y una porción de 3 cápsulas. Contiene 30 porciones y el costo calculado es $500 por porción. Si la porción de otro producto es distinta, no compares solo el número total de cápsulas.',
        'El cálculo no es una indicación de consumo. La pertinencia de un suplemento y sus precauciones deben evaluarse según la información de etiqueta y la orientación profesional cuando corresponda.'
      ]},
      {heading:'Precauciones al comparar',points:[
        'Formulaciones con el mismo nombre comercial pueden tener composiciones distintas.',
        'Las cantidades declaradas pueden utilizar unidades diferentes.',
        'El precio más bajo no equivale automáticamente al producto más adecuado.',
        'Confirma la presentación y condiciones finales de compra.'
      ]}
    ],
    faqs:[{q:'¿Dos frascos de 90 cápsulas son equivalentes?',a:'No necesariamente. Pueden diferir en ingredientes, cantidades por cápsula y número de cápsulas por porción.'}]
  }
};
