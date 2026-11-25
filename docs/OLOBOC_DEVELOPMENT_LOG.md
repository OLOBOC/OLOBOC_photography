# OLOBOC_ MOTORSPORT — REGISTRO HISTÓRICO DE DESARROLLO (DEV LOG)
**Plataforma Full Stack Profesional de Fotografía Motorsport**  
**Desarrollo Tecnológico:** [Nortcode](https://www.nortcode.es/)  
**Marca, Contenidos y Dirección Artística:** OLOBOC_ ([Instagram @oloboc_](https://www.instagram.com/oloboc_/))  
**Repositorio:** `https://github.com/OLOBOC/OLOBOC_photography.git`

---

## FASE 0: ARQUITECTURA BASE Y TRANSFORMACIÓN FULL STACK
- **Backend:** Node.js, Express, TypeScript, Prisma ORM sobre SQLite en desarrollo y preparado para PostgreSQL.
- **Seguridad:** Autenticación JWT con expiración de 24 horas, contraseñas hasheadas con bcrypt (coste 12), cookies HttpOnly y rate limiters por IP.
- **Almacenamiento Aislado:** Fotos originales en alta resolución ubicadas fuera del directorio público. Acceso exclusivo mediante tokens criptográficos SHA-256 de 64 caracteres hex.
- **Procesamiento de Imágenes:** Sharp configurado para generar 4 derivados por foto: original limpio, marca de agua diagonal server-side, preview WebP (1600px) y thumbnail WebP (400px).
- **Cotización y Stripe:** Motor de cálculo server-side con packs de volumen (Packs de 3, 5, 10 y 20 fotos), propina voluntaria y sesiones Stripe Checkout con webhook criptográfico.

---

## FASE 1: IDENTIDAD VISUAL Y FOTOGRAFÍA REAL
- **Fotografía Real:** Incorporación de 85 fotografías reales de competición en alta resolución organizadas en 4 eventos:
  1. *Rallysprint de Pravia 2026*
  2. *Rally de Asturias Histórico 2026*
  3. *Rallysprint de la Montaña 2026*
  4. *DriftSpain 2025*
- **Diseño Motorsport:** Portada full-bleed con telemetría HUD, tipografía *Bebas Neue* para titulares imponentes, *IBM Plex Mono* para datos técnicos y acento naranja `#E8431F`.
- **Galerías:** Disposición responsive en cuadrícula adaptativa tipo masonry.
- **Visor Modal:** Navegación por teclado (flechas, Escape), zoom de inspección y metadatos EXIF.

---

## FASE 2: VISIÓN ARTIFICIAL Y RECONOCIMIENTO DE VEHÍCULOS Y DORSALES
- **Pipeline Nativo:** Sharp (acondicionamiento morfológico, ecualización y binarización Otsu) + Tesseract.js para búsqueda de números con concurrencia controlada (2 hilos en `queue.service.ts`).
- **Recortes Visuales:** Generación automática de miniaturas `cropBase64` de la zona del dorsal para verificación instantánea por parte del fotógrafo.
- **Microservicio Desacoplado:** Creación del script `vision-worker/worker_yolo_paddle.py` basado en YOLOv8 (detección de carrocería) + PaddleOCR (lectura de placa de competición).
- **Benchmark:** Suite automatizada de métricas de precisión y recall en `server/test/vision-benchmark.ts`.

---

## FASE 3: AUDITORÍA FUNCIONAL, UX Y SISTEMA DE GESTIÓN Y COMPRA
- **Auditoría Exhaustiva:** Publicación de `docs/PHASE_3_AUDIT.md` catalogando 12 hallazgos técnicos.
- **Packs Comerciales Públicos:** Endpoint `GET /api/checkout/packs` y banner interactivo de precios vivos en la cabecera de los eventos.
- **Selección Inteligente:** Barra flotante fija inferior (`.floating-selection-bar`) con contador en tiempo real y llamada directa a compra.
- **Subida Masiva por Bloques (Chunked Upload):** Subida secuencial en bloques de 2 archivos concurrentes con previsualizaciones locales en navegador y barras de progreso porcentual.
- **Gestión Masiva de Catálogo:** Alternador de vista Cuadrícula/Lista, filtros por estado OCR y borrado por lotes (`POST /api/photos/admin/batch-delete`).
- **Modo Revisión Rápida ("Focus Review Mode"):** Interfaz lateral con recorte al 100% y atajos de teclado (`Enter`, `R`, `E`).

---

## FASE 4: CIERRE DEL FLUJO COMERCIAL REAL Y CORRECCIÓN DE BLOQUEANTES
- **Corrección de Enrutado SPA vs Stripe:**
  - `client/src/App.tsx`: Enrutador robusto compatible tanto con rutas directas HTTP (`/order-success?token=...`) como hash routing (`#order-success?token=...`).
  - `server/src/services/stripe.service.ts`: Redirecciones normalizadas a `${config.clientUrl}/#order-success?token=${downloadToken}&session_id={CHECKOUT_SESSION_ID}`.
- **Servicio de Email Transaccional:**
  - Implementación de `server/src/services/mail.service.ts` con soporte SMTP mediante `nodemailer` y modo simulación estructurado con persistencia en tabla `EmailLog`.
  - Plantillas HTML responsive con estética motorsport y fallback en texto plano para:
    1. Confirmación de compra con enlaces directos de descarga y advertencia de expiración de 7 días.
    2. Notificación de reembolso y revocación de acceso.
    3. Notificación interna al fotógrafo ante mensajes de contacto o solicitudes de retirada de imagen.
  - Idempotencia: el campo `confirmationEmailSentAt` en `Order` evita envíos duplicados al cliente.
- **Reembolsos Reales con Stripe y Revocación Digital:**
  - Método `stripeService.refundOrder(orderId, reason)` que invoca la API `stripe.refunds.create` (o simulación en desarrollo).
  - Transición atómica de estado a `REFUNDED`, registro de `refundedAt`, `refundReason` y expiración inmediata de descargas (`downloadExpiresAt = 1970-01-01`).
  - Protección estricta contra reembolsos duplicados.
- **Página de Confirmación y Estados de Pedido (`OrderSuccessPage`):**
  - Soporte completo para estados `PENDING` (con auto-polling cada 2s hasta confirmación de webhook), `PAID` (descargas y desglose), `REFUNDED` (aviso de acceso revocado) y `EXPIRED` (aviso de caducidad).
- **Panel Administrativo de Pedidos:**
  - Buscador por número de pedido o email del cliente.
  - Filtros por estado (`TODOS`, `PAGADOS`, `PENDIENTES`, `REEMBOLSADOS`).
  - Modal de detalle con fotografías adquiridas, ID de transacción, estado de email y acción de reembolso seguro con solicitud de motivo.
- **Activos Públicos y SEO Básico:**
  - Creación del directorio `client/public/` con `favicon.svg` motorsport, `robots.txt` y `sitemap.xml`.
- **Batería de Pruebas Automatizadas:**
  - Suite 7 añadida a `server/test/test-runner.ts` cubriendo 20 escenarios comerciales (carrito vacío, deduplicación, checkout, descargas 403/200, webhooks, emails, reembolsos).
  - Total: **62 de 62 pruebas superadas con éxito (100% pass rate)**.

---

## FASE 5: EVOLUCIÓN INTEGRAL, CUMPLIMIENTO LEGAL Y PREPARACIÓN PARA LANZAMIENTO
- **Almacenamiento Híbrido S3 / Cloudflare R2:**
  - `server/src/services/storage.service.ts`: Driver dual con cliente oficial `@aws-sdk/client-s3`.
  - Soporte de almacenamiento local con replicación y sincronización en la nube, y borrado por lotes de claves S3.
- **Fiscalidad Española y Facturación Simplificada (RD 1619/2012):**
  - Desglose del 21% de IVA en `pricing.service.ts`: base imponible neta (`netSubtotalCents`), tipo impositivo (`taxRatePercent = 21`) y cuota (`taxAmountCents`).
  - Nuevo endpoint `GET /api/checkout/order/:token/receipt` que genera una factura simplificada/justificante de compra oficial en HTML listo para imprimir.
  - Enlace de descarga de factura simplificada visible en `OrderSuccessPage.tsx`.
- **Comercio Digital y Desistimiento Legal (Art. 103.m LGDCU):**
  - Casilla de consentimiento previo expreso y renuncia al desistimiento digital implementada en `CartDrawer.tsx`.
  - Validación estricta en servidor en el endpoint `/checkout/create-session`.
- **Marco Legal y Términos de Compra:**
  - Redacción e integración de Condiciones de Compra (`#condiciones-compra`) en `LegalPage.tsx`.
  - Enlaces en el pie de página (`Footer.tsx`) y soporte de rutas en `App.tsx`.
- **Rendimiento de Galerías y SEO:**
  - Paginación progresiva de 40 fotos por bloque con botón dinámico de carga en `EventDetailPage.tsx`.
  - Títulos de página dinámicos y metaetiquetas OpenGraph y Twitter Card en `client/index.html`.
- **Documentación de Producción y Gobernanza:**
  - Creación de `.env.example`, `docs/PRODUCTION_SETUP_GUIDE.md`, `docs/ENVIRONMENT_VARIABLES.md`, `docs/LEGAL_REVIEW_CHECKLIST.md` y `docs/PRODUCTION_CHECKLIST.md`.
- **Pruebas Automatizadas:** Suite 8 implementada, alcanzando **66/66 tests superados (100% PASS)** y build limpio.
