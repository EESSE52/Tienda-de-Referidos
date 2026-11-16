# Contenido SEO — D’MonkeySport

Rama: feat/contenido-seo-guias, creada desde integracion/dmonkeysport-completo.

## Contenido disponible
- /guias — índice público.
- /guias/mejor-creatina-chile
- /guias/creatina-300-vs-500
- /guias/comparar-proteinas-whey
- /guias/como-elegir-suplementos
- /guias/comparar-zma-vitaminas

Las cinco guías iniciales vienen en src/lib/seo-guides.js y se muestran aunque la migración no esté aplicada.

## Activación del editor
1. Revisar, probar e integrar el PR a la rama que se despliega.
2. Ejecutar `npx wrangler d1 execute tienda_referidos --remote --file=migrations/0003_seo_articles.sql` (confirmar el nombre real de la DB enlazada como CATALOG_DB en el entorno).
3. Configurar un token secreto largo con `npx wrangler secret put SEO_ADMIN_TOKEN` en el Worker que sirve el sitio. No subirlo a Git ni usarlo en URLs.
4. Abrir /admin/contenido-seo; introducir el token. Permanece solo en memoria de la página, no se guarda en localStorage.
5. Publicar guías nuevas. Un registro 'published' en D1 sustituye una guía inicial con igual slug. Un registro 'draft' oculta también la guía inicial con el mismo slug, permitiendo despublicarla desde el editor.

## Seguridad y límites
- La API requiere bearer token en cabecera Authorization y compara de forma constante mediante WebCrypto.
- Las solicitudes de escritura exigen Content-Type JSON, Origin del dominio y límite de tamaño de texto.
- Nunca poner el token en html, fuente JS, enlaces, archivos .env versionados ni analítica.
- El editor usa texto plano en párrafos y evita renderizar HTML arbitrario.
- El token es compartido, no reemplaza cuentas personales, permisos granulares ni auditoría de cambios.
- Para una administración más amplia conviene adoptar la autenticación de administrador existente y permisos específicos.
- Revisar los datos de precios y cualquier afirmación comercial antes de publicar.
- Verificar el nuevo sitemap y solicitar indexación en Search Console. No se garantiza tráfico de Google.
