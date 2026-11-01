# Mercado Libre OAuth: preparación de desarrollo (sin activar producción)

Este cambio añade dos rutas de pruebas:
- POST /api/admin/mercadolibre/oauth/start (requiere el token administrativo ya existente)
- GET /api/admin/mercadolibre/oauth/callback (retorno registrado con state y cookie temporal)

**Estado:** deliberadamente desactivado. El callback valida el retorno, pero todavía NO intercambia el code por tokens ni los almacena, ni automatiza su renovación. No usar la Redirect URI de producción en este paso.

## Antes de probar

1. Disponer de un subdominio HTTPS de desarrollo independiente de dmonkeysport.com, por ejemplo una vista previa real de Cloudflare. Su dirección exacta no está predeterminada.
2. Registrar como nueva Redirect URI de la aplicación Mercado Libre esta URL exacta:
   https://DOMINIO-DE-PRUEBAS/api/admin/mercadolibre/oauth/callback
3. Configurar en el entorno de pruebas los valores privados:
   - ML_OAUTH_TEST_MODE=enabled
   - ML_CLIENT_ID=identificador de aplicación
   - ML_OAUTH_REDIRECT_URI=https://DOMINIO-DE-PRUEBAS/api/admin/mercadolibre/oauth/callback
   - ADMIN_API_TOKEN (existente)
4. NO enviar secretos por chat, no ponerlos en archivos versionados ni activar esta prueba en producción.
5. Iniciar el proceso únicamente desde el administrador autenticado: realizar POST al endpoint /api/admin/mercadolibre/oauth/start con el mismo Bearer ADMIN_API_TOKEN; abrir la URL authorization_url en el **mismo navegador**. La cookie HttpOnly con state dura 10 minutos y se borra al volver.
6. El retorno informará de validación del state, pero no completa todavía la autorización funcional: quedará pendiente almacenar tokens cifrados/privados y renovar el refresh token de forma atómica.

Se exige HTTPS y mismo origen entre start y callback. El host dmonkeysport.com y www.dmonkeysport.com está expresamente bloqueado. Para pruebas locales por HTTP, se pueden ejecutar los tests unitarios sin realizar el consentimiento OAuth real.

Documentación oficial: https://developers.mercadolibre.cl/autenticacion-y-autorizacion
