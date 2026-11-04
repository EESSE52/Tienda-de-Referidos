# Segunda etapa OAuth: tokens cifrados y renovación en pruebas (04-11-2026)

**Alcance:** únicamente Worker `tienda-de-referidos-oauth-pruebas`. Nunca conectar recursos de `tienda-de-referidos` ni las bases D1 de producción.

## Implementado

- Validación de OAuth `state` y cookie HttpOnly de 10 min, con callback HTTPS del mismo origen.
- Intercambio de `authorization_code` en `https://api.mercadolibre.com/oauth/token` con `ML_CLIENT_SECRET` privado.
- Cifrado AES-256-GCM de Access Token y Refresh Token antes de guardar en Workers KV exclusivo `ML_OAUTH_TOKENS`.
- Lectura de estado sin revelar tokens, botón administrativo de renovación solo al vencer o faltar menos de 60 segundos.
- Consultas de ítems mediante el token guardado, sin pasarlo al navegador.
- La renovación por ahora es **manual y supervisada** (solo administrador), NO automática. Mercado Libre invalida el anterior Refresh Token inmediatamente; KV es eventualmente consistente y no ofrece actualización condicional atómica. Una renovación automática/concurrente requerirá un Durable Object u otro coordinador de escrituras.

## Recursos externos que faltan

1. Crear un **namespace de KV nuevo y exclusivo para OAuth** en Cloudflare. Puede hacerse en dashboard > Workers KV o desde la terminal con `npx wrangler kv namespace create dmonkeysport-ml-oauth-pruebas`. Copiar exclusivamente el ID de **ese namespace**. No utilizar nombres o ID de otros Workers.
2. Agregar como **Secrets** al Worker de pruebas, nunca al de producción:
   - `ML_CLIENT_SECRET`: Client Secret de Mercado Libre Developers.
   - `ML_TOKEN_ENCRYPTION_KEY`: clave AES de 32 bytes, representada como 64 dígitos hexadecimales. Generarla con `openssl rand -hex 32`, guardar de forma privada y **no rotarla sin plan de migración**, porque los tokens previamente guardados dejarían de poder descifrarse.
   - `ADMIN_API_TOKEN`: secreto administrativo de pruebas que ya existe, no reemplazarlo ni compartirlo.
3. Conservar las variables de pruebas del dashboard: `ML_CLIENT_ID`, `ML_OAUTH_TEST_MODE=enabled` y `ML_OAUTH_REDIRECT_URI`.

**Importante:** un nuevo `wrangler deploy` requiere declarar el binding KV en la configuración; no basta con añadir un namespace si el Worker no lo enlaza. Preparar la configuración compilada con su ID en una variable de entorno local no secreta:

```bash
cd ~/Documentos/GitHub/"Tienda de Referidos"
git pull --ff-only origin integracion/dmonkeysport-completo
npm test
read -r -p "ID del KV nuevo y exclusivo: " ML_OAUTH_KV_NAMESPACE_ID
export ML_OAUTH_KV_NAMESPACE_ID
npm run oauth:prepare-preview
node -e 'const c=require("./dist/server/wrangler.oauth-preview.json"); if(c.name!=="tienda-de-referidos-oauth-pruebas" || c.d1_databases || c.routes || c.route || c.keep_vars!==true || c.kv_namespaces?.length!==1 || c.kv_namespaces[0].binding!=="ML_OAUTH_TOKENS") process.exit(1); console.log("Worker de pruebas aislado y KV configurado.");'
```

**No desplegar** hasta confirmar el namespace y ambos secretos. `keep_vars: true` conserva las variables del dashboard cuando se publique una nueva versión por Wrangler. Los secretos existentes se conservan al desplegar.

El despliegue aprobado será solo:
`npx wrangler deploy --config dist/server/wrangler.oauth-preview.json`

Al hacerlo, usar la misma dirección HTTPS existente:
`https://tienda-de-referidos-oauth-pruebas.eesse-canu.workers.dev/admin/`

Tras el despliegue, ingresar con `ADMIN_API_TOKEN`, pulsar `Comprobar token`. Primero indicará sin cuenta autorizada; después, `Conectar Mercado Libre (OAuth)` inicia una **nueva** autorización (el código anterior ya fue consumido y descartado). Al regresar debería informar almacenamiento cifrado correcto. Consultar una publicación específica desde el panel; la API puede seguir respondiendo 403 si el permiso está restringido.

Los resultados en KV pueden tardar en ser visibles por la consistencia eventual; evitar autorizar o renovar repetidamente de inmediato.

Referencias:
- https://developers.mercadolibre.cl/es_cl/obtencion-del-access-token
- https://developers.mercadolibre.cl/es_ar/publica-productos/autenticacion-y-autorizacion
- https://developers.cloudflare.com/kv/concepts/kv-bindings/
- https://developers.cloudflare.com/workers/wrangler/configuration/
