# Arquitectura Técnica — Plataforma OLOBOC_

Solución tecnológica Full Stack desarrollada por **Nortcode** (https://www.nortcode.es/) para la marca de fotografía de automovilismo **OLOBOC_**.

---

## 1. Visión General de la Arquitectura

```
                        [ NAVEGADOR / CLIENTE (Móvil / Desktop) ]
                                          │
                        (Vite + React 18 + TypeScript + SPA)
                                          │
                         HTTPS / JSON / API REST / Static
                                          │
                                          ▼
                         [ SERVIDOR API (Node.js 22 + Express) ]
                         ├── Helmet (CSP, HSTS, X-Content-Type)
                         ├── CORS Restringido
                         ├── Rate Limiter (Login, Contacto, Descargas)
                         ├── Cookie Parser (HttpOnly, SameSite=Lax)
                         └── Stripe Webhook Raw Buffer Handler
                                          │
         ┌────────────────────────┬───────┴─────────────────┬──────────────────────┐
         ▼                        ▼                         ▼                      ▼
  [ BASE DE DATOS ]       [ IMAGE PIPELINE ]        [ MOTOR OCR / VISIÓN ]   [ PASARELA STRIPE ]
   Prisma ORM               Sharp (libvips)           Tesseract.js WASM        Stripe Checkout
   - SQLite (Local Dev)     - Marcas de agua          - Extracción dígitos     - Webhooks firmados
   - PostgreSQL (Prod)      - Miniaturas WebP         - Bounding boxes         - Idempotencia
                            - Previews 1600px         - Scoring confianza      - Tokens descarga
                            - Originales privados     - Heurísticas dorsal
                                          │
                                          ▼
                               [ ALMACENAMIENTO SEGURO ]
                               - Storage Driver Local / S3 / R2
                               - Originales aislados de la web pública
                               - Descargas firmadas de 64 caracteres
```

---

## 2. Componentes del Sistema

### 2.1. Frontend (`client/`)
- **Tecnologías**: React 18, TypeScript, Vite.
- **Identidad visual**: Fiel a la identidad OLOBOC_ (paleta oscura `#08090B`, acento motorsport `#E8431F`, tipografías *Bebas Neue*, *Archivo*, *IBM Plex Mono*).
- **Módulos**:
  - `Header` & `Footer` con crédito discreto a Nortcode.
  - `HomePage`: Hero cinematográfico, ticker tape, últimas galerías, buscador por dorsal, presentación fotógrafo, contacto.
  - `ArchivePage`: Archivo histórico con filtros por temporada y categoría.
  - `EventDetailPage`: Galería en masonry con badges de dorsales detectados.
  - `PhotoViewer`: Visor modal a pantalla completa con zoom, atajos de teclado y selección.
  - `CartDrawer`: Carrito lateral reactivo con cotización server-side en tiempo real y selector de propinas/apoyo voluntario.
  - `OrderSuccessPage`: Portal de descargas inmediatas sin marca de agua para pedidos confirmados.
  - `OrderLookupPage`: Recuperador de pedidos para compras como invitado.
  - `LegalPage`: Textos estructurados (Aviso legal, Privacidad, Cookies, Licencia).
  - `AdminPage`: Panel privado con dashboard de KPIs, gestión de eventos, uploader por lotes, revisión OCR, pedidos, packs y ajustes.

### 2.2. Backend API (`server/`)
- **Tecnologías**: Node.js 22, Express, TypeScript, Prisma ORM.
- **Seguridad**:
  - Hashing de contraseñas con `bcryptjs` (salt 12).
  - Tokens JWT de sesión firmados con clave simétrica en cookie `HttpOnly`.
  - Rate limiting diferenciado por criticidad (10 intentos login / 15 min; 60 descargas / 10 min).
  - Verificación de precios 100% en backend (el cliente nunca envía el precio, solo los IDs de fotos).
  - Protección de descargas mediante tokens criptográficos de 64 caracteres hex (`crypto.randomBytes(32)`).
  - Webhooks de Stripe validados mediante firma criptográfica e idempotencia en base de datos.

### 2.3. Pipeline de Almacenamiento e Imágenes
- **Estructura de almacenamiento**:
  - `originals/`: Archivos JPEG/PNG originales de alta resolución. **Nunca accesibles públicamente**.
  - `watermarked/`: Archivo derivado con marca de agua en diagonal repetida "OLOBOC_".
  - `previews/`: Versión WebP optimizada (máximo 1600px) para el visor web.
  - `thumbnails/`: Versión WebP cuadrada/recortada (450px) para las rejillas.

---

## 3. Modelo de Datos (Prisma / SQL)

- `AdminUser`: Administradores con rol y hash seguro.
- `Session`: Sesiones activas con control de expiración y revocación remota.
- `Event`: Eventos deportivos (temporada, categoría, slug, estado DRAFT/PUBLISHED).
- `Photo`: Registro de fotografías con dimensiones, peso y claves de almacenamiento.
- `BibDetection`: Detecciones de dorsales con número, confianza, bounding box y estado (`CONFIRMED`, `DETECTED`, `MANUAL`).
- `Pack`: Configuración de packs comerciales (Pack 3, 5, 10, 20 fotos).
- `SystemSetting`: Clave-valor de ajustes (precios base, marca de agua, redes sociales).
- `Order`: Pedidos con número único (`OLB-YYYYMMDD-XXXX`), email, token de descarga, límite de descargas y caducidad.
- `OrderItem`: Asociación transaccional de fotografías compradas en un pedido.
- `PaymentWebhookEvent`: Registro de eventos de webhook de Stripe para garantizar idempotencia.
- `ContactMessage`: Mensajes recibidos con detección honeypot anti-spam.
- `TakedownRequest`: Solicitudes formales de revisión y retirada de fotografías por derechos de imagen.
- `AuditLog`: Registro cronológico inmutable de acciones administrativas.
