# Importar información manual desde una fotografía (OCR)

Nueva opción para el ingreso manual de D’MonkeySport, separada de Mercado Libre OAuth y D1.

## Uso
1. Abrir el administrador del entorno local/de pruebas que tenga categorías cargadas y conectar con el token administrativo.
2. Seleccionar la categoría del producto dentro de «Consultar varios productos de Mercado Libre».
3. En «Leer fotografía del producto (OCR)», elegir una foto de etiqueta o tabla de características en JPG, PNG o WEBP, hasta 10 MB.
4. Pulsar «Leer fotografía». Se descarga bajo demanda Tesseract.js 5.1.1 desde jsDelivr y sus modelos OCR de español e inglés. El procesamiento se realiza en el navegador, no se envía la foto a la API de D’MonkeySport.
5. Revisar y corregir el texto extraído dentro del campo «Pegar características copiadas de Mercado Libre».
6. Pulsar «Analizar características» para ver coincidencias, campos no reconocidos y avisos de unidades.
7. Pulsar «Aplicar campos reconocidos»; revisar los campos de la categoría, la marca, el nombre, el precio y los enlaces. El OCR no guarda, publica ni marca como verificadas las ofertas. Solo «Agregar al CSV sin consultar API» prepara el producto; guardar en D1 requiere otro paso de confirmación.

**Limitaciones:** la primera lectura OCR funciona mejor con etiquetas legibles, texto horizontal, fondo contrastado y fotografía sin desenfoque. Puede fallar con etiquetas curvas, reflejos o tablas complejas. El sistema no convierte volumen mL a peso g, ni deduce porciones o unidades. Las características que no existen como campos de la categoría se dejan para revisión. El administrador puede agregar campos propios a la categoría.

**Privacidad y conexión:** el navegador descarga la biblioteca OCR, un worker web y modelos de idioma desde proveedores externos CDN; por tanto necesita conexión a Internet en la primera ejecución. La foto seleccionada se usa localmente; el código de OCR no realiza ningún envío de la imagen al Worker, D1 ni Mercado Libre. La foto no se publica como imagen del producto. No existen cargos de API de visión por este OCR.

**Entornos:** las modificaciones están en `integracion/dmonkeysport-completo`. Verificar en local antes de desplegar. El Worker independiente `tienda-de-referidos-oauth-pruebas` deliberadamente carece de bases D1; allí puede verse el OCR, pero para aplicar atributos se necesita una categoría cargada.

Documentación del motor OCR: https://github.com/naptha/tesseract.js
