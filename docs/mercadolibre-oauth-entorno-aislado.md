# Entorno OAuth independiente para D’MonkeySport

La rama de desarrollo incluye un receptor OAuth de prueba desactivado por defecto. **Ningún comando de esta guía se ejecuta automáticamente.** La creación pública de un Worker de pruebas requerirá aprobación explícita antes de desplegar.

## Preparación local (sin desplegar)

Desde el repositorio:

```bash
npm run build
node scripts/prepare-oauth-preview.mjs
npm test
```

El script crea `dist/server/wrangler.oauth-preview.json`, utilizando la entrada compilada por Astro, con nombre distinto (`tienda-de-referidos-oauth-pruebas`). Elimina enlaces a D1, KV, R2, rutas de producción y variables de producción. **No modifica `wrangler.jsonc`, el Worker existente ni su base de datos.** La carpeta `dist` está ignorada por Git.

## Activación posterior (NO realizada)

Solo después de revisar y aprobar un despliegue independiente:

1. Crear un Worker independiente en Cloudflare con el archivo de configuración aislado. Confirmar que su dirección HTTPS corresponde al Worker de pruebas y nunca a `dmonkeysport.com`.
2. Registrar en Mercado Libre Developers una nueva URL de retorno exacta bajo ese dominio:
   `https://DOMINIO-REAL-DE-PRUEBAS/api/admin/mercadolibre/oauth/callback`
3. Configurar los valores únicamente como **Secrets del Worker de pruebas**:
   - `ADMIN_API_TOKEN` (contraseña administrativa específica de pruebas, no reutilizar la de producción).
   - `ML_CLIENT_ID` (Client ID de aplicación).
   - `ML_OAUTH_REDIRECT_URI` (URL HTTPS exacta recién registrada).
   - `ML_OAUTH_TEST_MODE` con valor `enabled`.
4. En el panel `/admin/` del **Worker de pruebas**, ingresar el token administrativo de pruebas y usar «Iniciar comprobación OAuth en pruebas».
5. La autorización abrirá el sitio oficial de Mercado Libre. El retorno verificará `state` con cookie HttpOnly (duración 10 minutos). **No intercambia el código por tokens ni guarda secretos de Mercado Libre**, todavía.
6. Al finalizar, revocar códigos de prueba antiguos si se compartieron accidentalmente y continuar solo tras implementar almacenamiento cifrado/privado y renovación segura.

## Consideraciones

Cloudflare recomienda usar Secrets, no `vars` públicas ni valores versionados, para credenciales. No introducir Client Secret ni tokens en GitHub ni en el chat. Las operaciones `wrangler deploy` y `wrangler secret put` pueden publicar de inmediato, por lo que requieren autorización explícita.

El panel OAuth puede autenticar al administrador sin cargar productos si el Worker no tiene D1: esto es intencional y reduce riesgos de afectar la base de producción.

Referencias:
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/wrangler/environments/
- https://developers.mercadolibre.cl/autenticacion-y-autorizacion
