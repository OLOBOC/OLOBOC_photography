# Guía de Pagos Stripe y Checkout — OLOBOC_

Implementado por **Nortcode** (https://www.nortcode.es/).

---

## 1. Principios de Seguridad en Pagos

1. **Cero almacenamiento de tarjetas**: Toda la recogida de datos bancarios se efectúa exclusivamente en los servidores certificados PCI-DSS de Stripe Checkout.
2. **Precios 100% verificados en servidor**: El frontend nunca envía precios calculados al backend. Envía únicamente los identificadores de fotografías seleccionadas y el backend calcula el precio exacto contra la base de datos.
3. **Idempotencia en Webhooks**: Cada evento de webhook recibido de Stripe se almacena en la tabla `PaymentWebhookEvent`. Si Stripe reintenta un evento ya procesado, se descarta inmediatamente evitando duplicidad.
4. **Desbloqueo exclusivo por backend**: Las descargas nunca se desbloquean en el cliente tras una redirección de éxito. El pedido pasa a estado `PAID` únicamente tras la confirmación verificada del webhook o evento de pago en backend.

---

## 2. Algoritmo de Cotización y Packs

El servicio `PricingService` implementa programación dinámica sobre los packs activos:
- **Precio base individual**: Configurable (defecto 1,49 €).
- **Packs por volumen**:
  - Pack 3 Fotos: 3,49 € (Ahorro: 0,98 €)
  - Pack 5 Fotos: 5,49 € (Ahorro: 1,96 €)
  - Pack 10 Fotos: 8,99 € (Ahorro: 5,91 €)
  - Pack 20 Fotos: 14,99 € (Ahorro: 14,81 €)
- **Apoyo voluntario (Tip)**: El cliente puede seleccionar libremente una aportación de apoyo (+1 €, +2 €, +5 €) que se añade como línea independiente en Stripe claramente catalogada como "Apoyo voluntario a OLOBOC_ Motorsport Photography".

---

## 3. Modo de Simulación en Desarrollo

Cuando `NODE_ENV !== 'production'` y las claves de Stripe no están configuradas en `.env`, el backend activa automáticamente el modo de simulación de desarrollo:
- Crea el pedido en la base de datos con estado `PENDING`.
- Genera el token criptográfico de 64 caracteres.
- Redirige a `/order-success?token=<token>&simulated=true`.
- El endpoint `/api/checkout/dev-simulate-success` confirma el pedido a `PAID`, permitiendo verificar el flujo de descarga sin coste ni necesidad de pasarela real.

---

## 4. Configuración para Producción

En el panel de Stripe (https://dashboard.stripe.com/):
1. Obtén tu Clave Secreta (`STRIPE_SECRET_KEY`) desde el Dashboard de Stripe.
2. Crea un endpoint de webhook apuntando a: `https://tudominio.com/api/checkout/webhook`.
3. Selecciona el evento: `checkout.session.completed`.
4. Copia el Secreto de Firma del Webhook (`STRIPE_WEBHOOK_SECRET`) desde el Dashboard.
5. Añade ambas variables al archivo de entorno del servidor.
