# Documentación del proyecto

## 1. Visión general

Este repositorio contiene una tienda de productos referidos creada con Astro, con una capa de administración local para gestionar listas, importar productos y preparar la publicación final del catálogo.

El proyecto funciona en dos capas:

- Frontend público: renderiza la tienda y el catálogo.
- Admin local: permite crear listas, cargar CSV/XLSX, validar productos y preparar la publicación.

La lógica de negocio principal se apoya en archivos JSON locales para el trabajo cotidiano y en Cloudflare D1 cuando se despliega en producción.

---

## 2. Stack tecnológico

- Astro 7
- @astrojs/cloudflare
- Cloudflare Workers
- Cloudflare D1
- Node.js para el panel administrativo local
- xlsx para importar Excel/CSV
- Vitest para validaciones

---

## 3. Estructura principal

- `src/`: código del sitio y lógica pública
- `functions/`: endpoints y funciones del backend del proyecto
- `public/admin/`: panel administrativo y plantillas de ejemplo
- `scripts/`: scripts ejecutables del admin, importación y entorno local
- `data/`: datos locales con listas, productos y backups
- `migrations/`: esquema de la base D1
- `wrangler.example.jsonc`: configuración base para Cloudflare

### Archivos clave

- `data/listas.json`: listas de productos configuradas
- `data/productos.json`: catálogo actual en uso local
- `data/backups/`: copias de seguridad auto-generadas
- `public/admin/plantilla-productos-prueba.csv`: ejemplo para importar productos
- `scripts/admin-server.mjs`: servidor local del admin
- `scripts/local-workflow.mjs`: arranque del stack local

---

## 4. Arranque local

### 4.1 Instalar dependencias

```bash
npm install
```

### 4.2 Levantar la tienda pública

```bash
npm run dev -- --host 127.0.0.1 --port 4321
```

La tienda queda en:

- http://127.0.0.1:4321/

### 4.3 Levantar el admin local

```bash
node scripts/admin-server.mjs
```

O usando el script del proyecto:

```bash
npm run admin
```

El admin queda en:

- http://127.0.0.1:4322/admin

### 4.4 Arranque combinado

```bash
node scripts/local-workflow.mjs
```

Este script intenta levantar el admin y servicios auxiliares, evitando puertos ocupados.

---

## 5. Flujo del admin local

El panel local cubre estas funciones:

1. Crear y editar listas
2. Importar productos desde CSV/XLSX
3. Validar campos obligatorios
4. Revisar segunda capa de validación del producto
5. Preparar la publicación del catálogo
6. Guardar copias de seguridad del estado

### Ruta principal

- http://127.0.0.1:4322/admin

### Endpoint de sesión

- /admin/session

### Endpoints relevantes

- /admin/api/listas
- /admin/api/productos
- /admin/api/productos/import
- /admin/api/publicacion/preview
- /admin/api/publicacion/guardar
- /admin/api/backups

---

## 6. Importación de productos

El flujo recomendado es manual y local:

1. Crear la lista correcta en el admin.
2. Descargar o preparar la plantilla CSV/XLSX.
3. Cargar el archivo con columnas como:
   - `lista_id`
   - `nombre`
   - `marca`
   - `precio`
   - `id_publicacion`
   - `enlace_referido`
   - `activo`
   - `imagen`
   - `notas`
   - `gramos_total`
   - `proteina_total`
   - `porciones`
   - `sabor`
4. Validar que el producto pase la regla de negocio.
5. Confirmar la importación.

### Plantilla de ejemplo

El proyecto incluye una plantilla de prueba en:

- [public/admin/plantilla-productos-prueba.csv](../public/admin/plantilla-productos-prueba.csv)

### Importante

El admin acepta archivos CSV, XLSX y XLS. La importación local se considera la ruta más estable del proyecto.

---

## 7. Mercado Libre y extracción automática

La extracción automática desde Mercado Libre puede fallar por restricciones del proveedor. El proyecto ya detectó que la API puede responder con `403` o bloquear la petición por política del origen.

Esto significa que:

- la app puede detectar IDs válidas de Mercado Libre,
- pero la extracción en vivo puede estar bloqueada por la plataforma,
- por lo que la importación manual es la ruta fiable.

El proyecto incluye lógica para procesar enlaces y extraer datos, pero en producción real puede requerir validación adicional o una fuente alternativa.

---

## 8. Publicación en Cloudflare

### 8.1 Base de datos D1

Crea la base D1:

```bash
npx wrangler d1 create tienda_referidos
```

Luego ejecuta la migración:

```bash
npx wrangler d1 execute tienda-referidos --remote --file migrations/0001_catalog.sql
```

### 8.2 Configuración

Copia la plantilla:

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

Y reemplaza el `database_id` del binding `CATALOG_DB`.

### 8.3 Despliegue

```bash
npm run worker:deploy
```

### 8.4 Recomendación de seguridad

El panel de administración debe protegerse con Cloudflare Access o una estrategia equivalente. No se recomienda dejar la ruta `/admin` pública sin control.

---

## 9. Datos y copias de seguridad

El proyecto guarda automáticamente copias de seguridad de:

- listas
- productos
- snapshots de publicación

Estas se almacenan en:

- `data/backups/`

Es recomendable crear una copia manual antes de importar un lote grande o hacer cambios de catálogo.

---

## 10. Flujo recomendado para trabajar

1. Levantar la tienda y el admin local.
2. Crear o ajustar la lista que corresponde al producto.
3. Preparar un CSV/XLSX con los datos reales.
4. Importar en el admin local.
5. Validar precios, nombres y enlaces.
6. Revisar la publicación del catálogo.
7. Cuando esté listo, cargar la versión final en Cloudflare D1 y desplegar.

---

## 11. Problemas frecuentes

### Admin no responde

- Revisa que el puerto 4322 no esté ocupado.
- Confirma el arranque con:

```bash
node scripts/admin-server.mjs
```

### Importación rechazada

- Verifica que la lista exista.
- Revisa que el `lista_id` coincida con la lista real del admin.
- Asegúrate de que el CSV tenga columnas válidas y precio positivo.

### Mercado Libre falla

- La API puede devolver `403` o bloquear la extracción.
- La solución estable es importar los datos manualmente.

---

## 12. Comandos útiles

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4321
npm run admin
node scripts/local-workflow.mjs
npm run build
npm run worker:deploy
```

---

## 13. Estado práctico del proyecto

El proyecto está funcional como flujo local y manual de gestión de catálogo. La capa de extracción de Mercado Libre puede estar limitada por el proveedor externo, pero la app sigue siendo útil para:

- preparar listas,
- cargar productos manualmente,
- validar catalogación,
- publicar en Cloudflare de forma controlada.

Este es el flujo recomendado hasta que el origen de datos externo quede disponible sin restricciones.
