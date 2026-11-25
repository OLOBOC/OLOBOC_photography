# GUÍA DE VARIABLES DE ENTORNO — OLOBOC_ MOTORSPORT

Este documento detalla todas las variables de entorno utilizadas por el backend y los servicios de la plataforma **OLOBOC_**.

---

## 1. Tabla Resumen de Variables

| Variable | Tipo | Requerida en Prod | Valor por defecto (Dev) | Propósito |
|---|---|---|---|---|
| `NODE_ENV` | String | Sí | `development` | Entorno de ejecución (`development`, `production`). |
| `PORT` | Número | Opcional | `4000` | Puerto HTTP del servidor Express. |
| `BASE_URL` | URL | Sí | `http://localhost:4000` | URL pública base del servidor API (usada en emails y enlaces). |
| `CLIENT_URL` | URL | Sí | `http://localhost:5173` | URL pública de la aplicación cliente (usada en redirecciones Stripe y CORS). |
| `DATABASE_URL` | Connection String | Sí | `file:./dev.db` | URI de conexión a la base de datos (SQLite en dev, PostgreSQL en prod). |
| `JWT_SECRET` | String | Sí (Crítico) | Clave dev de 32 bytes | Clave de firma simétrica HMAC para tokens JWT del panel administrativo. |
| `JWT_EXPIRES_IN` | String | Opcional | `24h` | Periodo de validez de la sesión del administrador. |
| `ADMIN_EMAIL` | Email | Opcional | `admin@oloboc.com` | Email del superadministrador inicial creado por seed. |
| `ADMIN_INITIAL_PASSWORD` | String | Opcional | `Admin_Oloboc_2026!` | Contraseña inicial creada por seed (cambiar al instalar). |
| `STRIPE_SECRET_KEY` | String | Sí (Producción) | `placeholder` | Clave secreta privada de la API de Stripe para cobros y reembolsos. |
| `STRIPE_WEBHOOK_SECRET` | String | Sí (Producción) | `placeholder` | Clave de firma para verificar la autenticidad criptográfica de webhooks Stripe. |
| `STORAGE_DIR` | Path | Opcional | `./storage` | Ruta en el disco local para almacenar carpetas `originals`, `watermarked`, `previews`, `thumbs`. |
| `S3_BUCKET` | String | Opcional (Recomendado) | `""` | Nombre del bucket compatible con S3 (AWS S3, Cloudflare R2, MinIO). |
| `S3_REGION` | String | Opcional | `eu-west-1` | Región del bucket S3. |
| `S3_ENDPOINT` | URL | Opcional | `""` | Endpoint personalizado para proveedores compatibles con S3 como Cloudflare R2. |
| `S3_ACCESS_KEY_ID` | String | Condicional | `""` | Credencial de acceso a la API de S3. |
| `S3_SECRET_ACCESS_KEY` | String | Condicional | `""` | Clave secreta de acceso a la API de S3. |
| `S3_PUBLIC_CDN_URL` | URL | Opcional | `""` | Dominio CDN público para servir thumbnails o previews con caché perimetral. |
| `SMTP_HOST` | String | Sí (Producción) | `""` | Host del servidor SMTP para el envío de confirmaciones y enlaces de descarga. |
| `SMTP_PORT` | Número | Opcional | `587` | Puerto del servidor SMTP (generalmente 587 para STARTTLS, 465 para SSL). |
| `SMTP_SECURE` | Booleano | Opcional | `false` | Establecer en `true` para puerto 465 SSL directo. |
| `SMTP_USER` | String | Condicional | `""` | Usuario para autenticación SMTP. |
| `SMTP_PASS` | String | Condicional | `""` | Contraseña para autenticación SMTP. |
| `SMTP_FROM` | String | Opcional | `OLOBOC_ Motorsport <notificaciones@oloboc.com>` | Remitente visible de los correos transaccionales. |

---

## 2. Comportamiento en Modo Simulación (Fallback)

Para permitir el desarrollo y testing completo sin incurrir en costes o dependencias externas bloqueantes:

- **Stripe**: Si `STRIPE_SECRET_KEY` contiene `placeholder` o no está configurada, el sistema opera en modo dev: genera enlaces de checkout simulados y permite completar compras y reembolsos de prueba de manera atómica.
- **Email (SMTP)**: Si `SMTP_HOST` no está configurado, el servicio `mailService` registra los envíos en la tabla `EmailLog` de la base de datos con estado `SIMULATED`, sin interrumpir ni fallar el flujo del usuario.
- **Almacenamiento (S3)**: Si `S3_BUCKET` no está configurado, el sistema almacena y sirve todas las fotografías (originales, previews, marcas de agua y miniaturas) en el almacenamiento local en disco `./storage`.
