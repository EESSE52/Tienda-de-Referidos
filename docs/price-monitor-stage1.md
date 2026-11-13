# Monitor automático de precios (etapa 1)

**Objetivo:** consultar precios de publicaciones MLC cada 24 horas, registrar resultados en D1 y mostrar alertas desde el 2 %. Nunca altera `catalog_products`, los enlaces afiliados ni `historial_precios`.

## Arquitectura
- Sitio Astro: `tienda-de-referidos`. Sigue desplegándose con `npm run worker:deploy`, sin cambiar su entrypoint.
- Worker independiente: `dmonkeysport-price-monitor`, configurado en `wrangler.monitor.jsonc`; Cron `0 9 * * *` (09:00 UTC, todos los días).
- Ambos leen `CATALOG_DB` / `tienda_referidos`. **Solo el monitor escribe** en `price_monitor_runs` y `price_monitor_checks`.
- Revisa como máximo **40 productos por ejecución**, priorizando publicaciones con menos revisiones. Incluye productos inactivos, pero excluye `es_prueba`. Los resultados de menos de 23 h no se repiten.
- Los endpoints administrativos están protegidos con el mismo `ADMIN_API_TOKEN` del sitio y no permiten cambiar precios.
- La API oficial utilizada es `GET /items/{MLC_ID}/prices`, con `Authorization: Bearer ...`. No se extraen páginas con scraping ni se siguen enlaces meli.la para deducir precios.
- Si hay promociones/contextos que generan importes diferentes, 401/403, falta token, respuesta no válida o falta de publicación, se registra **no verificable**, sin inventar precio. Un valor único sin restricciones se trata como observación; aun así requiere revisión humana para actualizar D1 público.

## Instalación (ejecutar una sola vez antes del despliegue del monitor)

```bash
git pull --ff-only origin integracion/dmonkeysport-completo
npm test
npm run build

# Backup recomendado de la base antes de migrar:
npx wrangler d1 export tienda_referidos --remote --output=/tmp/respaldo-tienda-referidos.sql
npm run monitor:migrate

# Sitio Astro (nuevo panel /admin):
npm run worker:deploy

# Worker separado con cron diario (activación explícita):
npm run monitor:deploy

# Secreto SOLO del Worker de monitoreo; nunca se añade al código ni al CSV.
# Se configura tras crear el Worker; hasta contar con token válido,
# las consultas se registrarán como "no verificable".
npx wrangler secret put ML_ACCESS_TOKEN --config wrangler.monitor.jsonc
```

La consulta automática requiere un **token oficial válido y autorizado para leer los precios de estas publicaciones**. Un token de afiliados o una URL `meli.la` no implica esos permisos. Si la API devuelve 401/403, consulta manual; no hay bypass.

## Probar localmente el evento programado

```bash
npm run monitor:dev
# En otra terminal:
curl 'http://localhost:8787/cdn-cgi/local/scheduled'
```

Los datos consultados en local dependen de los bindings y la configuración de Wrangler. Comprueba la ejecución y los registros en Cloudflare > Workers & Pages > `dmonkeysport-price-monitor` > Cron Events / Logs. Los Cron Triggers usan UTC.

## Administración

En `https://dmonkeysport.com/admin/#price-monitor-panel`:
- **Alertas y pendientes:** cambios de precio >=2 %, registros sin verificación, productos sin consulta y revisiones con más de 14 días;
- **Historial monitor:** últimos 60 resultados registrados para un producto;
- **Editar / confirmar** y **Revisión manual:** flujos existentes. El monitor por sí solo no cambia ningún precio;
- **Actualizar alertas:** consulta D1. No ejecuta otra ronda de Mercado Libre manualmente.

Si falta la migración, el panel mostrará una indicación para ejecutarla sin romper la conexión administrativa. Desplegar el monitor antes de la migración producirá fallos D1; se recomienda el orden anterior.

## Limitaciones conocidas

1. Un lote de 40 requiere varios días para revisar un catálogo grande; ampliar solo tras evaluar límites de API/Workers.
2. El `ML_ACCESS_TOKEN` estático caduca; la renovación automática OAuth queda para una etapa posterior. Nunca guardar tokens en D1 ni logs.
3. Un precio sin restricciones y un único importe no garantiza igual precio para todos los compradores; no se autoactualiza el precio público.
4. No se generan correos, WhatsApp ni notificaciones push en esta etapa; solo avisos dentro del panel de administración.
