# Admin local y flujo de trabajo

## Objetivo

El admin local permite gestionar el catálogo sin depender de una conexión cloud externa. Está pensado para importación, validación y preparación de datos antes de publicarlos.

---

## URL local

- Admin: http://127.0.0.1:4322/admin

---

## Cómo arrancar

```bash
cd "/home/eesse/Documentos/GitHub/Tienda de Referidos"
node scripts/admin-server.mjs
```

Si el puerto 4322 está ocupado, prueba cambiando la variable:

```bash
ADMIN_PORT=4323 node scripts/admin-server.mjs
```

---

## Sesión y seguridad

El admin usa una sesión local y un token CSRF para proteger los endpoints de escritura.

Cuando se carga la página, se crea un `admin_session` y el frontend lee el token CSRF desde `/admin/session`.

Los endpoints que modifican datos requieren:

- sesión válida
- header `X-CSRF-Token`

---

## Importación por archivo

El admin acepta:

- `.csv`
- `.xlsx`
- `.xls`

El flujo recomendado es:

1. Abrir el admin.
2. Crear o seleccionar la lista correcta.
3. Elegir el archivo.
4. Validar fila por fila.
5. Confirmar la carga.

La plantilla base está en:

- [public/admin/plantilla-productos-prueba.csv](../public/admin/plantilla-productos-prueba.csv)

---

## Estructura de datos esperada

Ejemplo mínimo:

```csv
lista_id,nombre,marca,precio,id_publicacion,enlace_referido,activo,imagen,notas,gramos_total,proteina_total,porciones,sabor
creatina,Creatina Monohydrate,Foodtech,29990,MLC35176477,https://example.com/producto,true,https://example.com/image.jpg,Producto de prueba,150,120,30,Blueberry
```

### Campos importantes

- `lista_id`: identificador de la lista
- `nombre`: nombre visible del producto
- `precio`: precio final en CLP
- `enlace_referido`: URL del producto
- `activo`: estado del producto
- `imagen`: imagen principal

---

## Validaciones del back

El admin no acepta filas incompletas ni listas inexistentes. La lógica valida:

- precio válido y > 0
- nombre presente
- enlace válido
- lista existente
- payload normalizado

---

## Copias de seguridad

Cada vez que se escribe catálogo o listas, el sistema guarda una copia en:

- `data/backups/`

Esto sirve para restaurar versiones anteriores si la importación no fue correcta.

---

## Recomendación operativa

Para un uso estable, mantén este flujo:

- local admin para importar y revisar,
- archivos CSV/XLSX para trabajar con datos reales,
- Cloudflare D1 y Worker para publicación final,
- Mercado Libre solo como fuente opcional, no como requisito principal.
