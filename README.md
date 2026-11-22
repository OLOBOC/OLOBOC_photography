# OLOBOC_ — Plataforma Full Stack de Fotografía Motorsport

Solución tecnológica Full Stack desarrollada por **Nortcode** ([https://www.nortcode.es/](https://www.nortcode.es/)) para la marca de fotografía de automovilismo **OLOBOC_**.

---

## 🏎️ Descripción del Proyecto

OLOBOC_ es una plataforma web completa, funcional y segura diseñada para fotógrafos de automovilismo deportivo (rally, rallysprint, circuito, drift y concentraciones). Permite a los aficionados y pilotos:

- **Explorar eventos deportivos** organizados por temporadas y categorías.
- **Encontrar fotografías de su coche por número de dorsal** gracias a un motor de reconocimiento automático OCR (Tesseract.js / pipeline de visión).
- **Visualizar fotografías protegidas** mediante marcas de agua generadas dinámicamente en servidor.
- **Seleccionar fotografías y packs con descuento** calculado en servidor a prueba de manipulaciones.
- **Comprar como invitado o usuario** mediante pasarela Stripe Checkout.
- **Descargar de forma inmediata archivos originales de alta resolución** sin marcas de agua mediante tokens de acceso criptográficos temporales.
- **Recuperar compras anteriores** mediante su dirección de correo y número de pedido.
- **Solicitar la revisión o retirada de imágenes** conforme al RGPD y la normativa sobre derechos de imagen.
- **Administrar la plataforma** mediante un panel de control profesional con métricas reales, uploader por lotes y revisión de dorsales.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, CSS moderno modular, Lucide Icons |
| **Backend API** | Node.js 22 LTS, Express, TypeScript |
| **Base de Datos & ORM** | SQLite (desarrollo local zero-config) / PostgreSQL (producción), Prisma ORM |
| **Procesamiento de Imágenes** | Sharp (libvips): generación de marcas de agua diagonales, miniaturas y WebP |
| **Motor OCR & Dorsales** | Tesseract.js (WASM) con whitelist numérica y preprocesamiento de contraste |
| **Pagos & Checkout** | Stripe Checkout SDK con verificación de webhooks e idempotencia |
| **Seguridad** | Helmet (CSP/HSTS), rate limiting, cookies HttpOnly, sesiones revocables, Bcrypt (12 rondas) |
| **Contenedores & CI/CD** | Docker, Docker Compose, GitHub Actions |

---

## 🚀 Inicio Rápido en Local

### 1. Requisitos Previos
- Node.js versión 20 o superior (recomendado Node 22).
- npm versión 10 o superior.

### 2. Instalación de Dependencias
```bash
# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del frontend
cd ../client
npm install
```

### 3. Configuración de Base de Datos y Seed
```bash
cd ../server
# Genera el cliente Prisma y sincroniza la base de datos SQLite
npx prisma generate
npx prisma db push

# Pobla la base de datos con eventos, ajustes iniciales y admin
npx tsx src/db/seed.ts

# Genera fotografías iniciales de demostración con dorsales reales (#7, #12, #23, #44, #5)
npx tsx src/db/seed-photos.ts
```

### 4. Compilación del Frontend
```bash
cd ../client
npm run build
```

### 5. Ejecución del Servidor
```bash
cd ../server
npm run start
```

La plataforma estará lista y disponible en tu navegador en:
**[http://localhost:4000](http://localhost:4000)**

*(O si deseas desarrollo interactivo con recarga rápida del frontend: ejecuta `cd client && npm run dev` y accede a [http://localhost:5173](http://localhost:5173)).*

---

## 🔑 Credenciales de Acceso al Panel de Administración

- **Ruta de acceso**: [http://localhost:4000/#admin](http://localhost:4000/#admin)
- **Email**: `admin@oloboc.com`
- **Contraseña**: `Admin_Oloboc_2026!`

---

## 🧪 Ejecución de la Batería de Pruebas Automatizadas

El proyecto incluye una suite de pruebas de integración completa (22 pruebas que validan autenticación, prevención de manipulación de precios, cálculo de packs, pasarela de pago, tokens de descarga y motor OCR):

```bash
cd server
npx tsx test/test-runner.ts
```

---

## 📚 Documentación Técnica Adicional

- [Arquitectura del Sistema (ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [Pipeline de Reconocimiento de Dorsales (OCR_VISION_PIPELINE.md)](docs/OCR_VISION_PIPELINE.md)
- [Guía de Pagos Stripe y Webhooks (STRIPE_CHECKOUT_GUIDE.md)](docs/STRIPE_CHECKOUT_GUIDE.md)
- [Auditoría de Seguridad (SECURITY_AUDIT.md)](docs/SECURITY_AUDIT.md)
- [Marco Legal, RGPD y Derechos de Imagen (LEGAL_RGPD_LSSI.md)](docs/LEGAL_RGPD_LSSI.md)
- [Checklist de Despliegue en Producción (PRODUCTION_DEPLOYMENT_CHECKLIST.md)](docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)

---

## 🏢 Créditos y Desarrollo

- **Marca, Fotografía y Contenidos**: OLOBOC_ Motorsport Photography
- **Desarrollo Tecnológico**: [Nortcode](https://www.nortcode.es/)
