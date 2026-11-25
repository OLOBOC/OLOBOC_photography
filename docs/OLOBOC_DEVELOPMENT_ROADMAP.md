# OLOBOC_ MOTORSPORT — ROADMAP DE DESARROLLO TÉCNICO
**Plataforma Full Stack Profesional de Fotografía Motorsport**  
**Desarrollador Tecnológico:** [Nortcode](https://www.nortcode.es/)  
**Marca y Producto:** OLOBOC_  
**Última actualización:** 25 de Noviembre de 2026 (Tras culminación de Fase 4)

---

## ESTADO DE FASES

| Fase | Título | Estado | Hito Principal |
|:---:|---|:---:|---|
| **Fase 0** | Arquitectura Base & Full Stack | **COMPLETADA** | Backend Express, Prisma, Sharp, SQLite/PostgreSQL, Stripe & JWT. |
| **Fase 1** | Identidad Visual & Fotografía Real | **COMPLETADA** | 85 fotos reales, hero full-bleed, visor fotográfico y diseño motorsport. |
| **Fase 2** | Visión Artificial & Reconocimiento | **COMPLETADA** | Pipeline OCR Sharp + Tesseract, recortes `cropBase64`, cola CPU y benchmark. |
| **Fase 3** | UX, Gestión Masiva & Selección | **COMPLETADA** | Barra de compra flotante, packs públicos, subida chunked, focus review. |
| **Fase 4** | Cierre Flujo Comercial & Emailing | **COMPLETADA** | Enrutado Stripe, email transaccional con SMTP/Mock, reembolsos y 62 tests. |
| **Fase 5** | Evolución Integral, Legal & S3 | **COMPLETADA** | Paginación galerías, IVA 21%, recibo oficial, desistimiento Art. 103.m, driver S3 y 66 tests. |
| **Fase 6** | Despliegue en Servidor & Go-Live | **PREPARADA** | Aportar NIF real y claves de producción en VPS conforme a la guía de despliegue. |

---

## DETALLE DE PRÓXIMAS FASES

### FASE 5: RENDIMIENTO DE GALERÍAS Y SEO DINÁMICO
- **Paginación y Virtualización:**
  - En eventos con más de 500 fotos, implementar carga progresiva por bloques de 40 imágenes o scroll virtual para reducir el consumo de memoria en dispositivos móviles.
- **SEO y Metadatos OpenGraph Dinámicos:**
  - Previsualizaciones enriquecidas en WhatsApp, Instagram y Twitter con la portada del evento y recuento de fotos.
- **Gesto de Zoom en Móviles:**
  - Soporte de gestos táctiles *pinch-to-zoom* en el visor de fotografías modal.

### FASE 6: ALMACENAMIENTO CLOUD S3 / CDN Y FACTURACIÓN
- **Migración a AWS S3 / Cloudflare R2:**
  - Activar el controlador S3 para guardar los originales en almacenamiento distribuido de alta disponibilidad con presigned URLs temporales para la descarga.
- **CDN Global:**
  - Distribución geográfica de los derivados WebP con caché en el borde para tiempos de carga inferiores a 50ms.
- **Generación de Recibos y Facturas:**
  - Módulo para descarga de recibo simplificado con desglose de IVA (21%) conforme a la legislación fiscal española para el cliente.

### FASE 7: LANZAMIENTO COMERCIAL Y DESPLIEGUE FINAL
- **Formalización Legal:**
  - Incorporación de los datos fiscales definitivos del titular (NIF, domicilio fiscal) en `LegalPage.tsx`.
- **Credenciales Reales de Producción:**
  - Configuración de claves definitivas de Stripe y servidor SMTP de producción (Resend, SendGrid o Google Workspace).
- **Despliegue Docker:**
  - Despliegue en servidor VPS dedicado (Ubuntu 24.04 LTS) con base de datos PostgreSQL, proxy inverso Nginx y certificado SSL Let's Encrypt con renovación automática.
