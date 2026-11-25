# Checklist de Despliegue en Producción — OLOBOC_

Elaborado por **Nortcode** (https://www.nortcode.es/).

---

## 1. Checklist Pre-Lanzamiento

- [ ] **Dominio y Certificados SSL**:
  - Configurar DNS (registros A / CNAME) apuntando al servidor o CDN (Cloudflare).
  - Activar certificado SSL/TLS estricto (Let's Encrypt o Cloudflare SSL).
- [ ] **Variables de Entorno**:
  - Generar un `JWT_SECRET` criptográfico de al menos 64 caracteres aleatorios.
  - Configurar `NODE_ENV=production`.
  - Configurar `CLIENT_URL=https://tudominio.com`.
  - Configurar `DATABASE_URL` hacia una instancia de PostgreSQL gestionada.
- [ ] **Pasarela de Pago Stripe**:
  - Dar de alta la cuenta de Stripe y completar la verificación bancaria e identidad fiscal.
  - Obtener las claves en vivo desde el Dashboard de Stripe.
  - Configurar el Webhook de producción apuntando a `https://tudominio.com/api/checkout/webhook`.
  - Registrar el secreto de webhook en las variables de entorno.
- [ ] **Almacenamiento de Fotografías**:
  - Para volumen estándar: Almacenamiento en volumen persistente SSD del VPS (`STORAGE_DRIVER=local`).
  - Para alto volumen: Activar Cloudflare R2 o AWS S3 (`STORAGE_DRIVER=s3`) para abaratar costes de salida de datos a cero.
- [ ] **Base de Datos y Migraciones**:
  - Ejecutar `npx prisma migrate deploy` en el servidor de producción.
  - Cambiar la contraseña inicial del administrador generada en el seed.
- [ ] **Copias de Seguridad (Backups)**:
  - Configurar copia diaria automatizada de la base de datos PostgreSQL (`pg_dump`).
  - Configurar copia redundante de la carpeta de almacenamiento de fotografías originales.
- [ ] **Validación Legal y Fiscal**:
  - Cumplimentar los campos del titular (NIF, nombre y domicilio) en `Aviso legal`.
  - Revisar régimen de IVA con asesoría fiscal.

---

## 2. Estimación de Costes de Infraestructura

| Servicio | Proveedor Recomendado | Coste Mensual Estimado | Justificación |
|---|---|---|---|
| Servidor VPS (Backend + App) | Hetzner / DigitalOcean (4GB RAM, 2 vCPU) | 8,00 € - 14,00 € / mes | Capacidad para procesar lotes de imágenes y Sharp sin sobrecarga. |
| Base de Datos PostgreSQL | Hetzner VPS o Supabase Free/Pro | 0,00 € - 10,00 € / mes | Base relacional con soporte transaccional y Prisma. |
| Almacenamiento de Fotos | Cloudflare R2 | ~ 0,015 $/GB almacenado | 0 € en costes de descarga/ancho de banda (*egress free*). |
| Pasarela Stripe | Stripe | 1,5% + 0,25 € por transacción | Solo se paga comisión por venta confirmada sin coste fijo. |
| CDN / DNS / WAF | Cloudflare (Plan Gratuito) | 0,00 € / mes | Caché de miniaturas y protección DDoS. |
| **TOTAL ESTIMADO** | | **~ 10,00 € - 25,00 € / mes** | **Estructura altamente optimizada y escalable.** |
