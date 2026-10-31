# Cloudflare D1 — D'MonkeySport

## Objetivo de esta etapa

Preparar el esquema relacional para reemplazar los archivos JSON como fuente de datos dinámica del catálogo. El sitio estático actual se conserva mientras se implementa la API del Worker en una etapa posterior.

## Tablas

- `categories`: categorías y su configuración de campos/métricas en JSON.
- `products`: ficha del producto, publicación de Mercado Libre, enlace afiliado, precio actual y atributos.
- `product_price_history`: histórico de precios por producto.
- `affiliate_clicks`: clics en enlaces afiliados. No almacena direcciones IP.

## Crear la base D1

Desde la carpeta raíz del proyecto, ejecutar:

```bash
npx wrangler d1 create dmonkeysport-db
```

Cloudflare devolverá un identificador `database_id`. Copiarlo y guardarlo; no publicarlo ni compartirlo en capturas.

Después, agregar la configuración D1 a `wrangler.jsonc` (se hará al conectar el Worker):

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "dmonkeysport-db",
      "database_id": "PEGAR_AQUI_EL_ID_REAL"
    }
  ]
}
```

## Aplicar migraciones

Primero en local:

```bash
npx wrangler d1 migrations apply dmonkeysport-db --local
```

Luego, cuando se revise la estructura y se confirme el despliegue:

```bash
npx wrangler d1 migrations apply dmonkeysport-db --remote
```

Verificar las tablas:

```bash
npx wrangler d1 execute dmonkeysport-db --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Para revisar las categorías:

```bash
npx wrangler d1 execute dmonkeysport-db --local --command "SELECT id, name, active FROM categories ORDER BY sort_order;"
```

## Reglas de integridad

- Los precios se guardan como enteros CLP.
- Los atributos específicos de cada categoría se guardan en `attributes_json`.
- Las configuraciones de categoría se guardan en `config_json`.
- Cada cambio de precio debe registrar una fila en `product_price_history`.
- El enlace afiliado original se conserva separado de la URL canónica del producto.
- No se importan automáticamente los productos de demostración del JSON. Antes se revisan y depuran para evitar publicar datos ficticios o identificadores inválidos.

## Seguridad

- No guardar tokens OAuth ni claves en el repositorio.
- Los secretos se configurarán con `wrangler secret put` cuando se implemente la integración API.
- La API de administración deberá autenticarse antes de permitir escrituras.
- No desplegar la API de administración públicamente sin autenticación.
