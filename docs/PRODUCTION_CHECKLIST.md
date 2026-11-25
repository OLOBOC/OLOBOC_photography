# CHECKLIST DE SALIDA A PRODUCCIÓN — OLOBOC_ MOTORSPORT

Lista de comprobaciones obligatorias antes de abrir la plataforma a clientes y compras reales.

---

## 1. SEGURIDAD Y CREDENCIALES
- [ ] La variable `NODE_ENV` está configurada como `production`.
- [ ] La clave `JWT_SECRET` ha sido regenerada con una cadena aleatoria criptosegura de al menos 48 bytes.
- [ ] La contraseña del superadministrador ha sido cambiada y no utiliza valores por defecto.
- [ ] La base de datos no está expuesta a internet (solo escucha en `localhost` o red interna VPC).
- [ ] Las cookies de sesión utilizan atributos `HttpOnly`, `SameSite=Lax` y `Secure` bajo HTTPS.
- [ ] Se aplican cabeceras de seguridad HTTP (HSTS, X-Content-Type-Options, Referrer-Policy).

## 2. PAGOS Y STRIPE
- [ ] Clave de API de Stripe cambiada de modo prueba a modo producción.
- [ ] Webhook de Stripe configurado en el Dashboard apuntando a `https://oloboc.com/api/checkout/webhook`.
- [ ] `STRIPE_WEBHOOK_SECRET` configurado en `.env` y verificado con un pago real de prueba (ej. 1,49 €).
- [ ] Verificado que tras el pago real se genera la orden en estado `PAID` y se envían los enlaces de descarga.
- [ ] Verificado el circuito de reembolso desde el panel de control administrativo hacia Stripe.

## 3. CORREO ELECTRÓNICO TRANSACCIONAL
- [ ] Servidor SMTP (ej. SendGrid, Mailgun, Amazon SES o SMTP corporativo) configurado en `.env`.
- [ ] Registros SPF, DKIM y DMARC configurados en el DNS del dominio para evitar que los correos de compra caigan en Spam.
- [ ] Verificada la recepción real del correo de confirmación de pedido con diseño responsive Motorsport y enlaces de descarga activos.
- [ ] Verificada la recepción real del correo de notificación de consultas o solicitudes de retirada recibidas desde la web.

## 4. ALMACENAMIENTO Y FOTOGRAFÍAS
- [ ] Bucket S3 o Cloudflare R2 creado y configurado con credenciales de lectura/escritura seguras.
- [ ] Regla de ciclo de vida o backup configurada para las imágenes originales de alta resolución.
- [ ] Verificado que las imágenes originales **nunca son accesibles públicamente** sin token válido de compra.
- [ ] Verificado que las fotos públicas llevan siempre la marca de agua y resolución reducida (preview/thumbnail).

## 5. REQUISITOS LEGALES Y FISCALES
- [ ] Datos de titularidad (nombre/razón social, NIF/CIF, dirección fiscal) cumplimentados en `LegalPage.tsx`.
- [ ] Términos y condiciones de compra revisados y aprobados por la asesoría jurídica del titular.
- [ ] Verificado que la factura simplificada descargable contiene el NIF del emisor y el desglose del 21% de IVA.
- [ ] Casilla obligatoria de renuncia al desistimiento digital (Art. 103.m LGDCU) operativa en el carrito.
- [ ] Política de cookies y banner de consentimiento en funcionamiento sin cookies de seguimiento de terceros no consentidas.

## 6. SISTEMAS Y MONITORIZACIÓN
- [ ] Servicio de copias de seguridad automáticas de la base de datos activado y probado (restauración simulada).
- [ ] Reinicio automático configurado mediante PM2 (`pm2 startup`) tras reinicios imprevistos del servidor.
- [ ] Límites de subida de archivos ajustados en Nginx (`client_max_body_size 100M`) para permitir lotes masivos de fotos.
- [ ] Monitorización de disponibilidad básica (UptimeRobot, BetterUptime o similar) configurada para `https://oloboc.com`.
