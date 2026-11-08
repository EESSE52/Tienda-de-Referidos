# D’MonkeySport — Fase 6: estadísticas comerciales

## Alcance
- Cuenta eventos de apertura de fichas de producto y clics en enlaces afiliados.
- Desglosa eventos por producto, categoría y vendedor en el administrador.
- Muestra los últimos 7, 30 o 90 días.
- Son eventos aproximados: **no** son usuarios únicos, ventas, compras ni comisiones.
- No se guardan IP, huellas, cookies, emails ni identificadores de visitante en `analytics_daily`.
- El registro fallido no interrumpe navegación ni enlaces de afiliados.
- No mide aún ventas reales; solo sería posible obtenerlas de reportes autorizados de cada programa de afiliados.

## Orden seguro de pruebas locales
1. Actualizar rama y correr `npm test` y `npm run build`.
2. Aplicar SOLO en D1 local:
   ```bash
   npx wrangler d1 execute tienda_referidos --local --file migrations/0002_analytics_daily.sql
   ```
3. Ejecutar `npm run worker:dev`, visitar fichas y hacer un clic de prueba en un enlace comercial real.
4. Conectar a `http://localhost:8787/admin/`, abrir **Estadísticas comerciales** y pulsar Actualizar.
5. Si el esquema local no existe, el panel muestra aviso, pero el sitio público continúa funcionando.

## Publicación posterior (NO ejecutar durante las pruebas)
La migración remota requiere autorización aparte y respaldo/verificación del esquema de `tienda_referidos`. No ejecutar `--remote` ni `npm run worker:deploy` hasta validar toda la fase y planificar despliegue. La base separada `dmonkeysport-db` no se toca.

## Limitaciones deliberadas
- Un mismo usuario puede generar más de una visita o clic; no se intenta identificarlo para deduplicar.
- Adblockers, fallas de red, navegación sin JS y bots pueden afectar los conteos.
- `sendBeacon` es de mejor esfuerzo, no una confirmación de que se registró el evento.
- Los datos no habilitan cálculos de ingresos ni conversiones reales.
