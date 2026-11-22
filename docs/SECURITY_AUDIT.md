# Auditoría de Seguridad por Diseño — OLOBOC_

Diseñado e implementado por **Nortcode** (https://www.nortcode.es/).

---

## 1. Medidas de Seguridad Implementadas

### 1.1. Autenticación y Gestión de Sesiones
- **Hashing de contraseñas**: Se utiliza `bcryptjs` con 12 rondas de salt (coste computacional resistente a fuerza bruta).
- **Cookies de sesión seguras**: La cookie `oloboc_admin_token` está configurada como:
  - `HttpOnly`: Inaccesible desde JavaScript, impidiendo robo de sesión por ataques XSS.
  - `SameSite=Lax`: Protección nativa contra falsificación de peticiones en sitios cruzados (CSRF).
  - `Secure`: Forzada en producción para transmisiones estrictas bajo HTTPS.
- **Revocación remota**: Las sesiones se validan activamente contra la tabla `Session` en base de datos. Si un administrador cierra sesión, el token queda inmediatamente invalidado.

### 1.2. Autorización y Mínimo Privilegio
- **Middleware `requireAdmin`**: Protege todos los endpoints de `/api/admin/*`, upload y operaciones destructivas.
- **Sin acceso directo a originales**: La carpeta `storage/originals` no está mapeada como estática. Los archivos originales solo se transmiten a través de `GET /api/checkout/order/:token/download/:photoId` tras verificar:
  1. Token de descarga existente y no caducado (7 días).
  2. Estado del pedido estrictamente confirmado (`PAID`).
  3. Pertenencia de la fotografía al pedido.
  4. Límite de descargas restantes (`downloadCount < maxDownloads`).

### 1.3. Protección contra Vulnerabilidades OWASP
- **Inyección SQL**: Utilización estricta de consultas parametrizadas a través de Prisma ORM. Ninguna consulta utiliza concatenación de cadenas directas.
- **Ataques de subida de archivos (Upload Malicioso)**:
  - Filtro estricto de tipo MIME (`image/jpeg`, `image/png`, `image/webp`).
  - Límite de tamaño por archivo de 25 MB en Multer en memoria.
  - Generación de identificadores internos aleatorios UUID v4 (`<uuid>-original.jpg`) evitando colisiones y ataques de *Path Traversal*.
  - Decodificación y re-renderizado mediante `sharp` (libvips), lo que elimina metadatos ejecutables maliciosos o scripts embebidos en el interior de imágenes.
- **Protección contra Fuerza Bruta y DoS**:
  - `loginLimiter`: Máximo 10 intentos de acceso cada 15 minutos.
  - `contactLimiter`: Máximo 10 envíos cada 15 minutos.
  - `downloadLimiter`: Máximo 60 peticiones de descarga cada 10 minutos.
  - `apiGeneralLimiter`: Máximo 200 peticiones por minuto.
- **Honeypot Anti-Spam**: El formulario de contacto incluye un campo oculto `web` no visible para humanos. Si un bot lo cumplimenta, el mensaje se descarta silenciosamente.
- **Cabeceras de Seguridad (Helmet)**:
  - Content Security Policy (CSP) restrictiva.
  - Protección contra framing (*clickjacking*).
  - Strict-Transport-Security (HSTS).
  - X-Content-Type-Options: nosniff.
