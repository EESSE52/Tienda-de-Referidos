# Comparación de múltiples ofertas y vendedores — D’MonkeySport

## Modelo y compatibilidad

Se reutiliza `catalog_products` de Cloudflare D1: **una fila por publicación de vendedor**, identificada por `id` y `id_publicacion`. No hay migración ni borrados de datos. Las categorías actuales siguen siendo `creatina` y `proteina`.

Cada publicación conserva `precio`, `fecha_precio`, `vendedor_nombre`, `id_publicacion`, `enlace_referido`, `activo` y `atributos`. Los campos opcionales nuevos son:

- `grupo_ofertas`: ID explícito de producto físico (3 a 80 caracteres, letras, números, guiones y guion bajo).
- `id_catalogo`: ID de catálogo del producto en Mercado Libre, cuando se conoce y corresponde al mismo producto.

En la interfaz pública, las ofertas se agrupan **solo** cuando comparten la misma categoría y el mismo `grupo_ofertas` no vacío; si no se define grupo manual, pueden agruparse por `id_catalogo` común. Nunca se agrupan por coincidencias de nombre.

No agrupes envases de distinto peso, sabor, formato, número de unidades ni contenido. Crea grupos diferentes cuando cambie la presentación.

## Uso del administrador

1. En `/admin/`, **edita la oferta Foodtech existente**, cuya publicación es `MLC1859621269`. En el campo «Grupo de ofertas» escribe, por ejemplo, `foodtech-creatina-1kg-sin-sabor` y guarda sin alterar su precio, atributos ni enlace. **Haz un respaldo de D1 antes de cambiar producción.**
2. Para otro vendedor, crea un **nuevo producto** con la misma categoría, marca, grupo y atributos físicos, pero con **su propia publicación**, vendedor, enlace de afiliado y precio referencial verificado manualmente. El grupo no sustituye `id_publicacion`: las publicaciones no pueden duplicarse.
3. Al crear la nueva oferta, deja «Producto activo» desmarcado hasta verificar información y enlace. Actívalo expresamente tras verificarlo.
4. En `/lista/creatina` se verá un producto representativo (el de menor precio registrado) y el total de ofertas; en `/producto/<id>` aparece el cuadro de vendedores, ordenado de menor a mayor precio.
5. La diferencia entre precios registrados no es un ahorro garantizado: no incluye envíos, descuentos, stock ni cambios posteriores.

## Importación CSV

Los CSV pueden incluir `grupo_ofertas`, `id_catalogo`, `vendedor_nombre`, `vendedor_id` y `id_publicacion` como columnas separadas de los atributos nutricionales. Cada fila representa una publicación específica; se valida antes de persistir.

## Despliegue seguro

1. Sincronizar la rama `integracion/dmonkeysport-completo`.
2. Ejecutar `npm test` y `npm run build` sin errores.
3. Revisar `npm run worker:dev` y comprobar las fichas locales.
4. Solo después de autorizarlo, desplegar con `npm run worker:deploy`. No ejecuta migraciones ni importa ejemplos por sí mismo.
5. **No inventar vendedores, precios ni enlaces** para mostrar una demostración en producción. Sin una segunda oferta real, la página indica «Una oferta registrada para este producto».

**Imagen**: mantener la imagen genérica hasta contar con autorización verificable. **Precio**: referencial, no verificado automáticamente al cargar la página.
