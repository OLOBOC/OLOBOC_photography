# OLOBOC_ MOTORSPORT — DIAGNÓSTICO GLOBAL Y AUDITORÍA TÉCNICA DEL ESTADO ACTUAL
**Documento oficial de auditoría arquitectónica, funcional y de producto**  
**Fecha de auditoría:** 25 de Noviembre de 2026  
**Dirección Tecnológica:** [Nortcode](https://www.nortcode.es/)  
**Marca, Contenidos y Dirección Artística:** OLOBOC_ ([Instagram @oloboc_](https://www.instagram.com/oloboc_/))  
**Repositorio Oficial:** `https://github.com/OLOBOC/OLOBOC_photography.git`  
**Compromiso de auditoría:** Inspección técnica pura y sin modificaciones en código ni base de datos.

---

## 1. RESUMEN EJECUTIVO

OLOBOC_ ha superado una transformación arquitectónica sustancial desde su concepción como prototipo estático inicial. El proyecto dispone hoy de:
- Un **backend sólido en Node.js, Express y TypeScript** con tipado estricto y ORM Prisma sobre SQLite (modo desarrollo) y preparado para PostgreSQL en producción.
- Un **frontend moderno en React 19 y Vite** con interfaz inspirada en la telemetría del motorsport, tipografías características (*Bebas Neue*, *IBM Plex Mono*, *Archivo*) y paleta cromática oscura (`#08090B` con acento naranja `#E8431F`).
- **85 fotografías reales** de competición de alta calidad distribuidas en 4 eventos activos con miniaturas optimizadas en formato WebP y marcas de agua server-side automáticas generadas con Sharp.
- Un **motor de cotización del lado del servidor** que aplica automáticamente descuentos por volumen (Packs de 3, 5, 10 y 20 fotos), calcula ahorros y previene manipulaciones de precio en cliente.
- Una **batería automatizada de 38 pruebas unitarias y de integración** que valida el flujo criptográfico de tokens, el aislamiento de fotos originales y la integridad de datos.

**Sin embargo, la plataforma NO está lista para su apertura comercial ni para producción.** 

La presente auditoría ha identificado cuellos de botella y discrepancias críticas que impedirían una operativa real:
1. **Desconexión entre el enrutador del cliente y los retornos de pasarela (Defecto Crítico de Navegación):** El frontend utiliza un enrutador basado en `window.location.hash` (`#event-...`, `#order-success`), mientras que las URLs de retorno de Stripe y los entornos de simulación devuelven rutas estándar HTTP (`/order-success?token=...`). Como consecuencia, al regresar del pago el comprador aterriza en la página de inicio y no ve sus enlaces de descarga.
2. **Ausencia total de servicio de correo transaccional (Bloqueante Comercial):** No existe integración con ningún proveedor de correo (SMTP, SendGrid, Resend, Amazon SES ni Nodemailer). Los compradores no reciben su recibo ni el enlace de descarga en su bandeja de entrada; si cierran la pestaña tras pagar, quedan desasistidos a menos que recuerden su número de pedido. Tampoco se notifican los mensajes de contacto ni las solicitudes de retirada de imagen.
3. **Falsa persistencia de reembolsos en Stripe:** La acción de reembolso en el panel de administración cambia el estado del pedido en la base de datos a `REFUNDED` y revoca el token de descarga, pero **no invoca la API de Stripe** para devolver el dinero a la tarjeta del cliente.
4. **Desconexión del microservicio avanzado de Visión Artificial:** El script de detección mediante YOLOv8 y PaddleOCR (`vision-worker/worker_yolo_paddle.py`) es un script de prueba independiente; no está orquestado como microservicio en segundo plano ni conectado a colas Redis/BullMQ en el flujo principal de subida.
5. **Carencia de activos públicos básicos y SEO técnico:** No existe el directorio `client/public`. Faltan `favicon.ico`, `robots.txt`, `sitemap.xml`, metaetiquetas OpenGraph dinámicas por evento y manifiesto PWA.
6. **Deficiencias legales no subsanadas:** Los textos de Aviso Legal, Privacidad y Condiciones de Contratación contienen marcadores de posición (`[PENDIENTE DE DEFINICIÓN LEGAL: NIF/CIF, Titular, Dirección]`). No se puede operar legalmente en España (LSSI-CE, RGPD, Ley de Consumidores) bajo este estado.

---

## 2. ESTADO REAL DEL PROYECTO

| Dimensión | Estado Real | Nivel de Madurez (1-5) | Comentarios Técnicos |
|---|---|:---:|---|
| **Arquitectura Backend** | Operativa / Funcional | 4/5 | Express modular, middleware de seguridad (Helmet, Rate Limiter, CORS), Prisma ORM robusto. |
| **Arquitectura Frontend** | Operativa con limitaciones de enrutado | 3/5 | React 19 + Vite rápido (build en 184ms), pero arquitectura de rutas hash susceptible a roturas con URLs externas. |
| **Base de Datos** | Estructurada y poblada | 4/5 | Esquema relacional íntegro con auditoría, transacciones e índices. En dev corre SQLite; Docker preparado para Postgres. |
| **Seguridad y Archivos** | Alta | 4/5 | Originales en alta resolución almacenados fuera de la raíz web, tokens de descarga SHA-256 de 64 caracteres. |
| **Sistema de Compra** | Parcial / Bloqueado comercialmente | 2.5/5 | Cotización server-side perfecta, pero falta retorno de Stripe por hash mismatch y falta emailing de recibos. |
| **Reconocimiento de Dorsales** | Básico nativo (Sharp + Tesseract) | 2.5/5 | Funciona con números claros, pero carece de detección de vehículos por deep learning en producción y el dataset real es escaso. |
| **Panel de Administración** | Funcional y completo en UI | 3.5/5 | Dashboard con métricas reales, subida masiva escalonada por bloques, revisión rápida con zoom y borrado múltiple. |
| **Aspectos Legales y Fiscales** | Borrador con plantillas | 1.5/5 | Textos con marcadores pendientes. Sin CIF/NIF, sin política fiscal (IVA intracomunitario / exención) definida. |
| **Despliegue y DevOps** | Preparado pero no desplegado | 3/5 | `docker-compose.yml` y `Dockerfile.server` configurados; falta despliegue en servidor real y SSL. |

---

## 3. ARQUITECTURA ACTUAL

```
                                 [ NAVEGADOR DEL CLIENTE ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          [ Frontend SPA (React 19) ]                  [ Stripe Checkout Hosted ]
          - Hash Routing (#event, #admin)              - Procesamiento de tarjetas
          - Carrito reactivo en LocalStorage           - Webhooks criptográficos
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │ HTTP REST / JSON
                                             ▼
                                  [ BACKEND EXPRESS API ]
                                  - Helmet & CSP estricto
                                  - Express Rate Limiters
                                  - JWT Auth & HttpOnly Cookies
                                             │
         ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
         ▼                   ▼                               ▼                   ▼
[ Prisma ORM ]      [ Image Service ]               [ Storage Service ]   [ Vision / OCR Queue ]
- SQLite (dev)      - Sharp Pipeline                - /storage/originals  - In-Memory Concurrency (2)
- PostgreSQL (prod) - Marcas de agua diagonales     - /storage/watermark  - Sharp Pre-processing
                    - Previews & Thumbs WebP        - /storage/derivatives- Tesseract.js Worker
```

### Componentes de infraestructura
1. **Runtime:** Node.js v20+ con TypeScript nativo vía `tsx` en desarrollo y compilación `tsc` en Docker.
2. **Base de Datos:** SQLite local (`server/prisma/dev.db`) con 7 eventos, 122 fotografías y 16 registros de dorsales.
3. **Almacenamiento:** Controlador de sistema de archivos local (`STORAGE_DRIVER=local`) con carpetas privadas (`storage/originals`) y derivadas (`storage/watermarked`, `storage/previews`, `storage/thumbnails`).
4. **Visión Artificial:** 
   - *Primario:* Pipeline nativo Sharp (ecualización, Otsu, filtrado morfológico) + Tesseract.js (concurrencia máxima = 2 workers).
   - *Secundario (Inactivo):* Script `vision-worker/worker_yolo_paddle.py` (requiere Python 3.10, PyTorch, ultralytics y paddlepaddle).

---

## 4. INVENTARIO REAL DE FUNCIONALIDADES

### A. Página Pública
- **Hero Principal:** Visualización de portada motorsport a pantalla completa, titular responsivo, HUD de telemetría y selector de acceso rápido a eventos.
- **Buscador de Dorsales (Home):** Campo de entrada de número de dorsal con selector de evento opcional.
- **Listado de Eventos (Home & Archivo):** Tarjetas con imagen de portada, categoría cromática, fecha, ubicación y contador de fotografías.
- **Filtros de Archivo:** Filtrado por categoría (*Rally*, *Rallysprint*, *Drift*, *Circuito*, *Otros*), temporada anual (*2024*, *2025*, *2026*) y búsqueda textual por nombre.
- **Selector de Vista (Archivo):** Alternador entre vista de cuadrícula (*Grid*) y vista tabular (*List*).
- **Detalle de Evento:** Cabecera con datos del evento, descripción editorial, banner interactivo de packs de descuento con precios reales desde base de datos, filtros por dorsal y ordenación (*defecto*, *dorsal asc*, *dorsal desc*, *nombre de archivo*).
- **Selección Rápida de Evento:** Botones globales "+ SELECCIONAR TODAS" y "DESELECCIONAR ESTE EVENTO".
- **Barra Flotante de Compra:** Barra inferior fija (`.floating-selection-bar`) que emerge al tener 1+ fotos seleccionadas, mostrando totalizador en tiempo real y botón de acceso al carrito.
- **Visor Fotográfico Modal (`PhotoViewer`):**
  - Pantalla completa con fondo desenfocado.
  - Navegación por flechas en pantalla y teclado (`ArrowRight`, `ArrowLeft`, `Escape`).
  - Atajo `Espacio` o `S` para marcar/desmarcar compra sin salir del visor.
  - Atajo `Z` para alternar zoom de inspección 2x.
  - Visualizador de metadatos EXIF (dimensiones, orientación, cámara si disponible).
  - Bloqueo de menú contextual (`onContextMenu` preventDefault) para dificultar guardado directo.
- **Carrito de Compra Drawer:**
  - Lista de fotos seleccionadas con miniaturas y botón de retirada individual.
  - Cálculo server-side en tiempo real mediante `POST /api/checkout/quote`.
  - Aplicación automática del pack más ventajoso con visualización de ahorro en euros.
  - Selector de aportación voluntaria / propina (*0 €, 1 €, 2 €, 5 €, 10 €*).
  - Campo de email de entrega con validación de formato.
- **Página de Éxito y Descargas (`OrderSuccessPage`):** Visualización del resumen de compra, desglose de items y botones de descarga directa en máxima resolución.
- **Recuperador de Pedidos (`OrderLookupPage`):** Formulario para clientes invitados que permite recuperar tokens de descarga introduciendo email y número de pedido (`OLB-YYYYMMDD-XXXX`).
- **Formulario de Contacto:** Envío validado con selector de motivos, campo honeypot contra robots (`web`), consentimiento de privacidad y soporte formal de reclamación de derechos de imagen (`TakedownRequest`).
- **Banner de Cookies:** Consentimiento granular (necesarias vs analíticas) persistido en `localStorage`.
- **Páginas Legales:** Vistas dedicadas para Aviso Legal, Política de Privacidad, Política de Cookies y Licencia de Imagen.

### B. Panel de Administración
- **Autenticación:** Login seguro con JWT firmado, expiración en 24h, hash bcrypt (coste 12) y almacenamiento en cookie HttpOnly / Bearer header.
- **Dashboard de Métricas:** KPIs reales calculados al vuelo (Eventos totales/publicados/borradores, fotos totales/publicadas, revisiones pendientes, pedidos pagados, ingresos brutos acumulados, gráfico de fotos por temporada y registro de auditoría reciente).
- **Gestión de Eventos:** Creación de nuevos eventos, edición de metadatos (nombre, fecha, categoría, ubicación, descripción, estado) y borrado en cascada.
- **Subida Masiva Progresiva (Chunked Upload):** Subida secuencial en bloques de 2 archivos concurrentes con previsualización local inmediata, monitor de progreso porcentual e indicador de fallos por fichero.
- **Gestión de Fotografías por Evento:** Vista dual (cuadrícula / lista), buscador por nombre de archivo, filtro por estado de OCR, selección múltiple, botón "Hacer Portada", adición manual de dorsales y borrado por lotes (`batch-delete`).
- **Revisión de Dorsales (Modo Tabla):** Tabla con filtros por estado (`DETECTED`, `CONFIRMED`, `REJECTED`, `MANUAL`), selector de evento, confirmación individual y acciones masivas.
- **Modo de Revisión Rápida ("Focus Mode"):** Interfaz secuencial pantalla a pantalla con recorte del dorsal ampliado (`cropBase64`), visualización del coche y atajos de teclado (`Enter` para confirmar, `R` para descartar, `E` para editar valor, `Esc` para salir).
- **Reprocesamiento OCR:** Encolamiento masivo o individual de fotografías de un evento con monitor de progreso en vivo (`GET /api/admin/events/:id/ocr-progress`).
- **Gestión de Pedidos:** Listado de ventas con filtro por estado (`PAID`, `PENDING`, `REFUNDED`), detalle de fotografías adquiridas y botón de reembolso/revocación de acceso.
- **Gestión de Packs Comerciales:** CRUD completo de packs (nombre, cantidad de fotos, precio en céntimos, destacado, estado activo).
- **Configuración del Sistema:** Edición en vivo de clave-valor (precio base unitario, texto de marca de agua, opacidad, enlaces sociales, email de contacto).
- **Gestión de Retirada de Imágenes (Takedowns):** Panel para aceptar o rechazar solicitudes de derechos de imagen con despublicación automática de la fotografía afectada.

### C. Infraestructura y Backend
- **Middleware:** `helmet` (CSP configurado para Stripe y fuentes de Google), `cors` controlado, `cookie-parser`, rate limiters por IP (general: 300 req/15min, auth: 10 req/15min, checkout: 20 req/15min, download: 60 req/hora, contact: 5 req/hora).
- **Almacenamiento Privado:** Función `storageService.getOriginalPath()` que devuelve la ruta física en disco fuera del directorio público.
- **Descargas Entituladas:** Endpoint `GET /api/checkout/order/:token/download/:photoId` con verificación estricta de token, estado `PAID`, fecha de expiración ($\le 7$ días), límite de descargas ($\le 10$ o $3\times$ fotos) y pertenencia de la foto al pedido.
- **Webhooks Stripe:** Endpoint con parser `express.raw()` verificado criptográficamente con `stripe.webhooks.constructEvent`.

---

## 5. TABLA DE FUNCIONALIDADES Y ESTADOS

A continuación se evalúa cada funcionalidad individual conforme a las directrices de auditoría:

| Funcionalidad | Estado Real | Justificación y Pruebas Realizadas |
|---|:---:|---|
| **Home Hero & Branding** | **VERIFICADA** | Renderizado correcto, telemetría HUD, imagen de fondo adaptativa, enlaces operativos. |
| **Buscador de Dorsales (Home)** | **VERIFICADA** | Comprobado vía API `GET /api/photos/search-bib?bib=12` devolviendo 4 fotos asociadas. |
| **Listado y Filtros de Archivo** | **VERIFICADA** | Comprobado `GET /api/events?category=Rally` y filtros de temporada. Alternancia cuadrícula/lista funcional. |
| **Detalle de Evento y Galería** | **VERIFICADA** | Carga de fotos, ordenaciones (dorsal asc/desc, nombre) y filtro por dorsal dentro del evento verificados. |
| **Visor Fotográfico Modal** | **VERIFICADA** | Navegación por teclado, zoom 2x, atajo `Espacio` para selección y bloqueo de click derecho verificados en cliente. |
| **Barra Flotante de Selección** | **VERIFICADA** | Emerge al seleccionar $\ge 1$ foto, muestra total dinámico con pack aplicado y abre el drawer. |
| **Selección Masiva (Todas / Ninguna)** | **VERIFICADA** | Acciones en `EventDetailPage` actualizan el contexto del carrito correctamente. |
| **Cálculo de Precios y Packs (Server)** | **VERIFICADA** | Comprobado mediante `POST /api/checkout/quote`. Suite 2 (7/7 tests superados). Aplica packs y propina fielmente. |
| **Checkout Simulado (Dev Mode)** | **VERIFICADA** | Comprobado `POST /api/checkout/create-session` y `POST /api/checkout/dev-simulate-success`. |
| **Checkout Real de Stripe** | **BLOQUEADA** | Requiere credenciales reales de producción (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Actualmente opera con clave de prueba de desarrollo. |
| **Redirección de Retorno de Stripe** | **ROTA** | `stripe.service.ts` redirige a `/order-success?token=...`, pero el cliente es una SPA de rutas Hash. El usuario aterriza en `/` perdiendo la vista del pedido. |
| **Descarga de Fotos Originales** | **VERIFICADA** | Comprobado mediante descarga real de 42.470 bytes (`200 OK`, `image/jpeg`, attachment limpio). Suite 3 superada. |
| **Recuperación de Pedidos (Lookup)** | **VERIFICADA** | Endpoint `POST /api/checkout/lookup` probado con éxito con email y número de pedido. |
| **Envío de Emails de Confirmación** | **PENDIENTE** | **No existe código de envío de email.** Los compradores no reciben su enlace de descarga por correo electrónico. |
| **Notificación por Email de Contacto** | **PENDIENTE** | Se guarda en base de datos, pero el fotógrafo no recibe ningún correo de aviso. |
| **Formulario de Contacto y Takedown** | **VERIFICADA** | `POST /api/contact` probado con éxito; registra en BD y crea `TakedownRequest` si procede. |
| **Login y Sesión de Administrador** | **VERIFICADA** | `POST /api/auth/login` devuelve token JWT, cookie HttpOnly y perfil. Suite 1 (4/4 tests superados). |
| **Dashboard de Estadísticas Admin** | **VERIFICADA** | `GET /api/admin/dashboard` devuelve KPIs reales agregados de la base de datos. |
| **Subida Masiva en Bloques (Admin)** | **VERIFICADA** | Subida por lotes con generación de 4 derivados Sharp y encolamiento OCR. Suite 4 superada. |
| **Borrado Masivo de Fotos (Admin)** | **VERIFICADA** | `POST /api/photos/admin/batch-delete` probado con borrado atómico en BD y disco físico. Suite 6 superada. |
| **Revisión de Dorsales en Tabla** | **VERIFICADA** | Confirmación y rechazo individual y masivo (`batch-confirm`, `batch-reject`) operativos. |
| **Modo Revisión Rápida ("Focus Mode")** | **VERIFICADA** | Navegación por teclado (`Enter`, `R`, `E`) sobre recorte `cropBase64` integrada en `AdminPage.tsx`. |
| **Pipeline OCR Nativo (Sharp + Tesseract)** | **VERIFICADA** | Comprobado en Suite 4 y 5. Detecta dorsales contrastados y genera `cropBase64`. |
| **Visión Artificial con YOLOv8 + PaddleOCR** | **IMPLEMENTADA SIN VERIFICAR** | El script `vision-worker/worker_yolo_paddle.py` existe, pero es un script externo no conectado al flujo de subida de la web. |
| **Reembolsos en Stripe desde Admin** | **PARCIAL** | Actualiza la base de datos a `REFUNDED` y cancela descargas, pero **no llama a la pasarela bancaria de Stripe**. |
| **Gestión de Packs desde Admin** | **VERIFICADA** | CRUD de packs en `server/src/routes/admin.routes.ts` y tabla de `AdminPage.tsx` verificado. |
| **Gestión de Ajustes de Sistema** | **VERIFICADA** | `PUT /api/admin/settings` persiste ajustes en tabla `SystemSetting`. |
| **Banner de Cookies RGPD** | **VERIFICADA** | Bloquea y guarda preferencias de cookies en `localStorage`. |
| **Textos Legales (LSSI, RGPD, Licencia)** | **PARCIAL** | Estructura redactada pero contiene marcadores de posición pendientes de datos reales del fotógrafo. |
| **Activos Públicos y SEO (Favicon, Sitemap)** | **PENDIENTE** | No existe carpeta `client/public`, ni favicon, ni robots, ni sitemap. |

---

## 6. PROBLEMAS DETECTADOS Y CLASIFICACIÓN

### Problema 1: Desconexión de rutas de éxito de compra (Stripe vs SPA Hash)
- **Severidad:** **CRÍTICO**
- **Ubicación:** `server/src/services/stripe.service.ts` (líneas 80 y 125) y `client/src/App.tsx` (líneas 17-24).
- **Causa demostrada:** `stripe.service.ts` genera la URL de éxito como:
  `${config.clientUrl}/order-success?token=${downloadToken}&session_id={CHECKOUT_SESSION_ID}`
  Al regresar de Stripe, el navegador carga la ruta HTTP `/order-success`. El cliente React lee exclusivamente `window.location.hash.slice(1)`. Dado que no hay hash (`#`), el estado `currentRoute` se inicializa con el valor por defecto `'home'`. El comprador es enviado a la portada sin ver sus fotografías ni sus enlaces de descarga.
- **Reproducción:** Realizar un checkout simulado o navegar a `http://localhost:5173/order-success?token=xxx`. El usuario ve la Home en lugar de `OrderSuccessPage`.
- **Impacto:** Experiencia de compra rota tras el pago bancario. Generaría reclamaciones inmediatas de los usuarios.

### Problema 2: Inexistencia de servicio de correo transaccional
- **Severidad:** **CRÍTICO**
- **Ubicación:** Servidor global (`server/src/services/`).
- **Causa demostrada:** No existe ninguna librería de correo instalada (`nodemailer`, `@sendgrid/mail`, `resend`) ni configuración SMTP en `config.ts`. Tras un pago completado, no se despacha ningún email con el recibo y el enlace de descarga permanente de 7 días.
- **Reproducción:** Realizar una compra. El campo `customerEmail` se almacena en base de datos, pero la bandeja de entrada del comprador permanece vacía.
- **Impacto:** Si el comprador cierra el navegador, pierde el acceso a sus fotos salvo que conozca su número de pedido exacto para usar `order-lookup`.

### Problema 3: Reembolsos de administrador desconectados de Stripe
- **Severidad:** **ALTO**
- **Ubicación:** `server/src/routes/admin.routes.ts` (línea 290, `router.post('/orders/:id/refund')`).
- **Causa demostrada:** El endpoint ejecuta un `prisma.order.update` marcando el pedido como `REFUNDED` y poniendo `downloadExpiresAt = new Date(0)`. No existe ninguna llamada a `stripe.refunds.create({ charge: order.stripeChargeId })`.
- **Reproducción:** Ejecutar un reembolso desde el panel de administración. El pedido aparece como reembolsado en el panel, pero el dinero nunca se devuelve a la tarjeta del comprador en Stripe.
- **Impacto:** Descuadre contable e inconsistencia entre la pasarela financiera y el panel de control.

### Problema 4: Carencia de paginación o virtualización en galerías fotográficas
- **Severidad:** **MEDIO**
- **Ubicación:** `client/src/pages/EventDetailPage.tsx` y `client/src/pages/AdminPage.tsx`.
- **Causa demostrada:** Las fotos se descargan en un único array masivo y se renderizan simultáneamente en el DOM. Un evento real con 800–2.000 fotos creará miles de nodos DOM pesados con imágenes WebP.
- **Reproducción:** Subir 500 fotos a un evento. Abrir la página en un dispositivo móvil de gama media. Se producen caídas de framerate y posibles cierres de pestaña por falta de memoria.
- **Impacto:** Bloqueos de rendimiento y mala experiencia de usuario en competiciones con gran volumen fotográfico.

### Problema 5: Ausencia de microservicio de Visión Artificial en producción
- **Severidad:** **MEDIO**
- **Ubicación:** `vision-worker/worker_yolo_paddle.py` y `server/src/services/ocr.service.ts`.
- **Causa demostrada:** El servidor Node.js solo ejecuta Tesseract.js local sobre Sharp. El worker de Python con YOLOv8 y PaddleOCR está desarrollado como un script aislado sin contenedor Docker propio ni integración en el flujo de subida de la web.
- **Impacto:** La tasa de detección en imágenes complejas de rally (coches con barro, rotulación agresiva o tomas lejanas) sigue dependiendo del OCR general, requiriendo mayor supervisión manual por parte del fotógrafo.

### Problema 6: Inexistencia de la carpeta `client/public` y metadatos SEO
- **Severidad:** **MEDIO**
- **Ubicación:** `client/public/`.
- **Causa demostrada:** La carpeta no existe en el proyecto. No hay `favicon.ico`, ni `robots.txt`, ni `sitemap.xml`, ni `manifest.json`.
- **Reproducción:** Solicitar `http://localhost:5173/favicon.ico` o `http://localhost:5173/robots.txt`. Devuelve error 404.
- **Impacto:** Los navegadores muestran el icono por defecto, las redes sociales (Instagram, Twitter, WhatsApp) no muestran previsualizaciones enriquecidas con imagen al compartir enlaces, y los buscadores no pueden indexar los eventos adecuadamente.

### Problema 7: Marcadores legales no resueltos
- **Severidad:** **MEDIO**
- **Ubicación:** `client/src/pages/LegalPage.tsx`.
- **Causa demostrada:** Presencia explícita de textos de sustitución: `[PENDIENTE DE DEFINICIÓN LEGAL: NIF o CIF aplicable]`, `[PENDIENTE DE DEFINICIÓN LEGAL: Dirección o provincia de actividad fiscal]`.
- **Impacto:** Incumplimiento del artículo 10 de la LSSI-CE (obligación de información general del prestador de servicios en comercio electrónico).

---

## 7. PROBLEMAS REPRODUCIBLES (MATRIZ TÉCNICA)

| Identificador | Entorno | Pasos Exactos de Reproducción | Resultado Obtenido | Resultado Esperado |
|---|---|---|---|---|
| **BUG-01** | Frontend | 1. Completar simulación de compra o navegar a `http://localhost:5173/order-success?token=xxx`<br>2. Observar la pantalla resultante. | La aplicación carga la página de inicio (`HomePage`). | Debe cargar `OrderSuccessPage` y mostrar las descargas adquiridas. |
| **BUG-02** | Backend / Red | 1. Enviar el formulario de contacto con datos válidos.<br>2. Revisar logs y bandeja de entrada de `contacto@oloboc.com`. | Mensaje guardado en BD; 0 correos enviados. | Debe enviarse notificación por correo al fotógrafo y acuse al cliente. |
| **BUG-03** | Admin / Stripe | 1. Seleccionar un pedido pagado en el panel.<br>2. Pulsar botón «Reembolsar». | El pedido cambia a `REFUNDED` en BD; Stripe no recibe llamada. | Debe emitirse un refund bancario real a través del SDK de Stripe. |
| **BUG-04** | Navegador | 1. Solicitar `http://localhost:5173/favicon.ico`. | Error 404 Not Found en consola de red. | Respuesta 200 con el isotipo de OLOBOC_. |
| **BUG-05** | Admin Upload | 1. Subir un archivo no permitido (ej. archivo `.txt` o `.pdf`). | El backend rechaza con 400 (`MulterError`), pero el frontend no muestra un mensaje descriptivo en la tarjeta del archivo. | El archivo debe marcarse con badge rojo indicando formato inválido. |

---

## 8. FUNCIONALIDADES PENDIENTES

1. **Pasarela de Emailing:** Integración con servicio SMTP / API transaccional (Resend o Amazon SES) con plantillas HTML motorsport:
   - Email de entrega de pedido con botón de descarga y fecha de caducidad.
   - Email de aviso de nuevo pedido para el fotógrafo.
   - Email de aviso de consulta o solicitud de retirada de imagen.
2. **Corrección de Enrutado:** Soporte híbrido en `App.tsx` para detectar tanto `window.location.pathname` (`/order-success`) como `window.location.hash` (`#order-success`), o migración controlada a HTML5 History API.
3. **Paginación / Carga Perezosa en Galería:** Implementación de carga infinita (*infinite scroll*) o paginación por bloques de 40 fotos para optimizar el rendimiento en eventos masivos.
4. **Exportación de Facturas / Recibos Simplificados:** Generación de recibo de compra en PDF descargable conforme a la legislación fiscal española para el cliente.
5. **Worker de Visión Artificial en Docker:** Empaquetar el microservicio Python de detección de vehículos en el `docker-compose.yml` conectado vía Redis para eventos de subida masiva.
6. **Configuración de Almacenamiento S3 / CDN:** Conectar el adaptador S3 existente con un bucket seguro de producción y CDN Cloudflare para distribución ultra-rápida de derivados WebP.
7. **Textos Legales Definitivos:** Sustituir los placeholders por los datos fiscales reales del titular de OLOBOC_.

---

## 9. EVALUACIÓN DE LA EXPERIENCIA VISUAL

- **Calidad Visual e Identidad:** **Excelente (9/10).** La combinación de negro puro (`#08090B`), gris superficie (`#101215`), blanco marfil (`#F3EFEA`) y el acento naranja motorsport (`#E8431F`) transmite una personalidad editorial contundente, moderna y auténtica.
- **Uso de Fotografía:** Las 85 fotografías reales de rally y drift en Asturias y Cantabria elevan drásticamente la credibilidad de la plataforma frente a cualquier competidor genérico.
- **Tipografía y Jerarquía:** El uso de *Bebas Neue* para titulares imponentes y *IBM Plex Mono* para datos de telemetría (velocidad de obturación, apertura, fechas) encaja a la perfección con la cultura del automovilismo.
- **Microinteracciones y Animaciones:** Las transiciones de hover, badges luminosos de telemetría (`● REC // ARCHIVO`) y barras flotantes son sutiles y respetan la directiva `@media (prefers-reduced-motion: reduce)`.
- **Experiencia Móvil:** La navegación es cómoda, con zonas táctiles superiores a 44px, drawer lateral accesible y barra inferior fija para compra que no obstruye la lectura.
- **Aspectos a mantener intactos:** La estética HUD motorsport, el estilo de las marcas de agua, la disposición masonry y la paleta de color.
- **Aspectos a mejorar en fases posteriores:** Incluir vista previa con zoom interactivo en dispositivos móviles (gesto de pellizco *pinch-to-zoom*) en el visor modal.

---

## 10. EVALUACIÓN DEL PANEL ADMINISTRATIVO

- **Dashboard:** Muy intuitivo; los contadores de ingresos, pedidos y fotos por temporada ofrecen una visión clara del estado del negocio.
- **Subida Masiva:** La introducción del sistema por bloques (*chunks* de 2 fotos) ha resuelto los fallos de memoria que existían anteriormente. Los badges individuales de estado (*PENDIENTE*, *SUBIENDO*, *LISTO*, *ERROR*) dan visibilidad total durante la ingesta.
- **Gestión de Fotografías:** El selector de vista cuadrícula/lista y la selección múltiple facilitan la depuración de fotos descartadas.
- **Modo Revisión Rápida de Dorsales ("Focus Review Mode"):** Es una de las mejores herramientas añadidas. La visualización lateral del recorte ampliado al 100% junto con los atajos de teclado (`Enter`, `R`, `E`) reduce el tiempo de revisión de dorsales a menos de un segundo por fotografía.
- **Puntos débiles a corregir:** Falta de paginación en el listado de fotos de eventos muy grandes y falta de botón para forzar sincronización con Stripe en pedidos.

---

## 11. EVALUACIÓN DEL SISTEMA DE COMPRA

1. **Cotización del lado del servidor:** Impecable. Ningún precio ni cálculo de descuento es confiado al cliente. Si un usuario intenta enviar un precio manipulado desde la consola, el backend lo recalcula contra la base de datos y lo ignora.
2. **Packs por Volumen:** La tarificación viva (`Pack 3 Fotos: 3,49 €`, `Pack 5 Fotos: 5,49 €`, etc.) incentiva la compra múltiple. El algoritmo de empaquetado optimiza automáticamente la combinación más barata para el comprador.
3. **Flujo de Pago:** El checkout se encuentra configurado para Stripe Checkout Sessions con webhook de confirmación. Sin embargo, se mantiene en modo simulación de desarrollo hasta configurar las claves de producción.
4. **Descargas:** Los enlaces de descarga no exponen rutas directas ni nombres de archivo reales en disco. Validan estrictamente que el pedido esté en estado `PAID`, que no hayan transcurrido más de 7 días y que la foto solicitada pertenezca a los ítems adquiridos.

---

## 12. EVALUACIÓN DE OCR Y VISIÓN ARTIFICIAL

1. **Motor Actual (En Producción Local):**
   - Utiliza `Sharp` para acondicionamiento morfológico: recorte de márgenes, estiramiento de contraste y umbralización.
   - Pasa la región a `Tesseract.js` configurado con lista blanca numérica (`0123456789`).
   - Concurrencia limitada a 2 hilos mediante `queue.service.ts` para no saturar la CPU del servidor.
   - **Limitación Real:** Tesseract no sabe dónde está la puerta del coche; busca texto numérico en toda la imagen. En fotos con patrocinadores o números de teléfono rotulados, pueden producirse falsos positivos (ej. año 2024 detectado como dorsal 2024).
2. **Motor Avanzado (YOLOv8 + PaddleOCR en `vision-worker/`):**
   - El script `worker_yolo_paddle.py` primero localiza la caja delimitadora del vehículo (*car/truck*) con YOLOv8, recorta el vehículo y aplica PaddleOCR sobre él.
   - Su precisión teórica es sustancialmente superior, pero requiere una GPU o un entorno Python con librerías pesadas (PyTorch, Ultralytics) que actualmente no está desplegado en el flujo principal.

---

## 13. SEGURIDAD Y PROTECCIÓN DE DATOS

- **Protección de Fotografías Originales:** **CUMPLIDA.** Los archivos RAW y JPEG en alta resolución sin marca de agua se almacenan en carpetas privadas no accesibles directamente vía HTTP. Solo se puede acceder a ellos a través de un token criptográfico generado tras el pago.
- **Protección contra Descargas Masivas / Scraping:** Se aplican marcas de agua diagonales incrustadas en los píxeles (no mediante capas CSS que puedan ocultarse con el inspector). Las imágenes de previsualización están en resolución reducida (máximo 1600px en WebP).
- **Inyección SQL / NoSQL:** **CUMPLIDA.** Prisma ORM utiliza consultas parametrizadas internamente en todas las interacciones con la base de datos.
- **Cabeceras HTTP y CSP:** **CUMPLIDA.** Helmet está configurado bloqueando scripts externos no autorizados y permitiendo únicamente los dominios de Stripe y Google Fonts.
- **Autenticación:** Las contraseñas están protegidas con `bcrypt` (12 rondas de salt). Los tokens JWT expiran en 24 horas y se transportan en cookies protegidas.

---

## 14. LEGAL, FISCALIDAD Y LANZAMIENTO

- **RGPD / LOPDGDD:** 
  - La base legal de tratamiento para la venta es la ejecución contractual (Art. 6.1.b RGPD).
  - El formulario de contacto y retirada de imágenes dispone de casilla de verificación obligatoria no premarcada.
  - El banner de cookies bloquea cookies no técnicas hasta la aceptación del usuario.
  - **Falta:** Especificar el Delegado de Protección de Datos o la dirección postal fiscal del titular.
- **LSSI-CE:**
  - **Incumplimiento actual:** Los artículos 10 de la Ley 34/2002 exigen mostrar de forma permanente, fácil, directa y gratuita el nombre o denominación social, residencia o domicilio, NIF y datos de inscripción registral. Los textos actuales tienen marcadores pendientes.
- **Fiscalidad y Facturación:**
  - La plataforma vende licencias de descarga de archivos digitales a consumidores finales (B2C).
  - Conforme a la normativa europea de comercio electrónico, los servicios prestados por vía electrónica a particulares están sujetos a IVA.
  - En España se aplica el 21% de IVA. Si el fotógrafo tributa en el régimen de autónomos o sociedad, debe emitir factura simplificada o factura completa si el cliente lo solicita. Actualmente no se genera desglose de base imponible e IVA ni número de serie fiscal en los pedidos.
- **Derechos de Imagen en Competiciones Deportivas:**
  - Las competiciones en circuitos o tramos públicos autorizados cuentan habitualmente con normativas de federación que contemplan la toma de imágenes deportivas.
  - No obstante, la plataforma cuenta con un canal formal de retirada (`TakedownRequest`) que permite a cualquier piloto o asistente solicitar la ocultación de su imagen conforme al derecho de supresión y a la Ley Orgánica 1/1982 de protección civil del derecho al honor, a la intimidad y a la propia imagen.

---

## 15. ROADMAP RECOMENDADO

Se propone un plan de trabajo ordenado por impacto y dependencias lógicas:

### Fase 4: Corrección de Flujo Crítico de Compra y Notificaciones (Prioridad Inmediata)
- **Objetivo:** Garantizar que un cliente que paga recibe sus fotos sin fallos de navegación y recibe un correo con su enlace.
- **Problemas que resuelve:** Bug de redirección de Stripe (BUG-01), falta de correos transaccionales (BUG-02).
- **Módulos implicados:** `client/src/App.tsx`, `server/src/services/stripe.service.ts`, nuevo `server/src/services/mail.service.ts`, `server/src/config.ts`.
- **Criterios de aceptación:**
  1. Al completar un pago simulado o real en Stripe, el usuario es redirigido a la pantalla de éxito mostrando sus descargas sin recargar la portada.
  2. El comprador recibe un email con diseño motorsport con su número de pedido y enlace directo válido por 7 días.
  3. El fotógrafo recibe notificación de cada compra y mensaje de contacto.

### Fase 5: Activos Públicos, SEO Técnico y Rendimiento de Galería
- **Objetivo:** Mejorar la visibilidad en redes sociales, indexación en Google y rendimiento en dispositivos móviles.
- **Problemas que resuelve:** Falta de `client/public` (BUG-04), lentitud potencial en eventos masivos.
- **Módulos implicados:** `client/public/` (creación de favicon, robots, sitemap), `client/index.html`, `client/src/pages/EventDetailPage.tsx` (paginación / virtualización).
- **Criterios de aceptación:**
  1. Favicon cargado en todas las páginas.
  2. Metadatos OpenGraph dinámicos que muestran la foto de portada del evento al compartir en WhatsApp o Instagram.
  3. Renderizado fluido de eventos con más de 500 fotografías sin caídas de framerate.

### Fase 6: Reembolsos Reales en Pasarela y Gestión Financiera
- **Objetivo:** Conectar el panel de administración con la pasarela bancaria de Stripe para devoluciones automáticas.
- **Problemas que resuelve:** Inconsistencia de reembolsos (BUG-03).
- **Módulos implicados:** `server/src/routes/admin.routes.ts`, `server/src/services/stripe.service.ts`.
- **Criterios de aceptación:**
  1. Al pulsar «Reembolsar» en administración, se ejecuta `stripe.refunds.create` y el dinero se reintegra en la tarjeta del cliente.
  2. Generación de recibo de compra con desglose de IVA (21%) descargable por el comprador.

### Fase 7: Regularización Legal y Puesta en Producción
- **Objetivo:** Cumplimiento normativo estricto y despliegue final en servidor de producción con SSL.
- **Problemas que resuelve:** Marcadores de posición legales, despliegue con Docker y variables de entorno seguras.
- **Módulos implicados:** `client/src/pages/LegalPage.tsx`, `.env.production`, `docker-compose.yml`, configuración DNS y certificado SSL Let's Encrypt.
- **Criterios de aceptación:**
  1. Todos los textos legales cuentan con datos válidos del titular.
  2. Despliegue en contenedor Docker sobre servidor con base de datos PostgreSQL y proxy inverso Nginx con HTTPS.

---

## 16. PRIORIDADES INMEDIATAS (QUÉ HACER PRIMERO)

1. **P0 (Bloqueante):** Corregir el enrutador en `client/src/App.tsx` para aceptar rutas directas de éxito (`/order-success?token=...`) permitiendo que el retorno de Stripe funcione.
2. **P0 (Bloqueante):** Desarrollar un servicio de email transaccional (`mail.service.ts`) para entrega de recibos y enlaces de descarga.
3. **P1 (Crítico):** Crear la carpeta `client/public` con `favicon.ico`, `robots.txt` y tarjeta social OpenGraph.
4. **P1 (Crítico):** Conectar el botón de reembolso del panel de control con el método `stripe.refunds.create` del SDK de Stripe.
5. **P2 (Importante):** Reemplazar los textos de marcador legal en `LegalPage.tsx` con la información fiscal del fotógrafo.

---

## 17. QUÉ SE HA PODIDO VERIFICAR REALMENTE

Durante esta auditoría se ha ejecutado y comprobado mediante pruebas reproducibles:
1. **Arranque y Salud del Backend:** Endpoint `/api/health` respondiendo `200 OK` con datos de versión y créditos a Nortcode.
2. **Autenticación Administrativa:** Emisión y validación de tokens JWT mediante `POST /api/auth/login` con credenciales de prueba.
3. **Buscador de Dorsales:** Endpoint `/api/photos/search-bib` con dorsal `#12`, retornando 4 fotos en alta resolución en 4 eventos distintos.
4. **Cotización de Precios:** Endpoint `/api/checkout/quote` validando el precio base unitario (1,49 €), el descuento de Pack 3 Fotos (3,49 € con ahorro de 0,98 €) y la suma de propinas.
5. **Creación de Sesión de Compra y Simulación:** Generación de pedido en base de datos (`PENDING`), paso a `PAID` y verificación de token de 64 caracteres hex.
6. **Descarga de Fotografía Limpia:** Descarga exitosa mediante stream del archivo original sin marcas de agua (42.470 bytes) respetando las cabeceras `Content-Disposition`.
7. **Formulario de Contacto:** Inserción exitosa en base de datos con comprobación de filtro honeypot.
8. **Compilación de Producción:** `npm run build` en cliente completado en 184ms con 0 errores TypeScript.
9. **Suite de Pruebas Automatizadas:** 38 de 38 pruebas unitarias y de integración superadas con éxito.

---

## 18. QUÉ NO SE HA PODIDO COMPROBAR

1. **Pagos Reales con Tarjeta Bancaria:** No se han realizado transacciones con dinero real en Stripe (las claves son de entorno de pruebas / simulación y el usuario explícitamente prohibió pagos reales).
2. **Recepción de Webhooks de Stripe en Red Pública:** Al no estar desplegado el servidor en una IP pública con dominio y HTTPS, no se ha probado la recepción de webhooks disparados directamente desde los servidores de Stripe en Estados Unidos (solo se ha probado la validación criptográfica de la firma del webhook en local).
3. **Comportamiento bajo Concurrencia Extrema:** No se han realizado pruebas de estrés de más de 500 usuarios simultáneos descargando fotografías al mismo tiempo.
4. **Inferencia de Visión con GPU:** No se ha ejecutado el modelo YOLOv8 + PaddleOCR sobre tarjeta gráfica CUDA dedicada en este entorno de trabajo local.

---

## 19. LIMITACIONES DE ESTA AUDITORÍA

1. **Entorno de Pruebas Local:** La inspección se ha ejecutado sobre el entorno de desarrollo en Windows con SQLite. Aunque la arquitectura está preparada para PostgreSQL en Docker, el comportamiento en un cluster de producción con latencias de red reales puede presentar particularidades adicionales.
2. **Restricción de No Modificación:** En estricto cumplimiento de la instrucción del usuario (*«EN ESTA FASE NO DESARROLLES NI MODIFIQUES NADA»*), ningún archivo de código ni registro de la base de datos ha sido alterado para solucionar los fallos detectados.
3. **Asesoramiento Legal:** El análisis de cumplimiento de LSSI-CE, RGPD y Ley de Consumidores se realiza desde la perspectiva técnica y de buenas prácticas de comercio electrónico; requiere la validación jurídica formal por parte del asesor legal o fiscal del fotógrafo antes del lanzamiento comercial.

---
*Fin del informe de auditoría técnica. Documento generado por Nortcode para OLOBOC_.*
