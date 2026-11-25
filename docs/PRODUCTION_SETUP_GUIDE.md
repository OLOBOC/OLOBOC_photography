# GUÍA DE DESPLIEGUE EN PRODUCCIÓN — OLOBOC_ MOTORSPORT

**Tecnología:** Node.js (Express, TypeScript, Prisma, Sharp, Tesseract.js) + React (Vite, TypeScript)  
**Desarrollo tecnológico:** Nortcode — https://www.nortcode.es/

---

## 1. DECISIÓN DE ARQUITECTURA E INFRAESTRUCTURA

### Incompatibilidad con Serverless puro (Vercel / Netlify / Cloudflare Pages Functions)
La arquitectura de backend de OLOBOC_ requiere:
- Binarios nativos C/C++ de procesamiento de imágenes con alto rendimiento (**Sharp** y **libvips**).
- Motor de visión artificial y OCR en memoria (**Tesseract.js** o workers Python con YOLO).
- Almacenamiento y streaming de archivos protegidos de alta resolución (imágenes originales de hasta 20-30 MB).
- Ejecución prolongada para procesamiento en colas por lotes.

Por ello, el backend **no es compatible con entornos serverless efímeros con límite de tamaño de bundle y memoria (como Vercel Serverless)**.

### Infraestructura Recomendada
1. **VPS Dedicado o Servidor Cloud:**
   - Proveedor: Hetzner, OVH, DigitalOcean o AWS EC2.
   - Especificaciones mínimas: 2 vCPU, 4 GB RAM, 50 GB SSD (NVMe).
   - Sistema Operativo: Ubuntu 24.04 LTS.
2. **Base de Datos:**
   - PostgreSQL 16 administrado o local con copias de seguridad automáticas (pg_dump diario).
3. **Almacenamiento de Objetos:**
   - Cloudflare R2 (recomendado por ausencia de costes de transferencia de salida / *egress fees*) o AWS S3.
4. **Proxy Inverso & SSL:**
   - Nginx o Caddy con certificados SSL automáticos Let's Encrypt.
5. **Gestor de Procesos:**
   - PM2 o Docker Compose.

---

## 2. PROCEDIMIENTO PASO A PASO DE DESPLIEGUE EN VPS (UBUNTU 24.04)

### Paso 1: Preparación del Servidor
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Paso 2: Clonar el Repositorio
```bash
cd /var/www
sudo git clone https://github.com/OLOBOC/OLOBOC_photography.git oloboc
sudo chown -R $USER:$USER /var/www/oloboc
cd /var/www/oloboc
```

### Paso 3: Configuración de Base de Datos PostgreSQL
```bash
sudo -u postgres psql
# En la consola de PostgreSQL:
CREATE DATABASE oloboc_production;
CREATE USER oloboc_user WITH ENCRYPTED PASSWORD 'TU_PASSWORD_ULTRA_SEGURO';
GRANT ALL PRIVILEGES ON DATABASE oloboc_production TO oloboc_user;
\q
```

### Paso 4: Variables de Entorno del Backend
Crear `/var/www/oloboc/server/.env` a partir de `.env.example`:
```bash
cp .env.example server/.env
nano server/.env
```
Ajustar:
- `NODE_ENV=production`
- `DATABASE_URL="postgresql://oloboc_user:TU_PASSWORD_ULTRA_SEGURO@localhost:5432/oloboc_production?schema=public"`
- `JWT_SECRET` generado con `openssl rand -base64 48`
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` de producción
- Parámetros SMTP para correos reales
- Parámetros S3 o Cloudflare R2

### Paso 5: Compilación y Migración del Backend
```bash
cd /var/www/oloboc/server
npm ci
npx prisma migrate deploy
npm run build
```

### Paso 6: Compilación del Frontend (Single Page Application)
```bash
cd /var/www/oloboc/client
npm ci
npm run build
# Los archivos estáticos optimizados se generarán en /var/www/oloboc/client/dist
```

### Paso 7: Configuración de PM2 para el Backend
Crear `/var/www/oloboc/ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'oloboc-api',
      cwd: '/var/www/oloboc/server',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```
Iniciar el servicio:
```bash
pm2 start /var/www/oloboc/ecosystem.config.cjs
pm2 save
pm2 startup
```

### Paso 8: Configuración de Nginx y Certificados SSL
Crear `/etc/nginx/sites-available/oloboc.com`:
```nginx
server {
    server_name oloboc.com www.oloboc.com;

    # Frontend estático
    root /var/www/oloboc/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend Proxy
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
}
```
Activar y solicitar certificado SSL:
```bash
sudo ln -s /etc/nginx/sites-available/oloboc.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d oloboc.com -d www.oloboc.com
```

### Paso 9: Configuración del Webhook de Stripe
En el Dashboard de Stripe:
1. Ir a **Desarrolladores > Webhooks**.
2. Añadir endpoint: `https://oloboc.com/api/checkout/webhook`.
3. Seleccionar evento: `checkout.session.completed`.
4. Copiar el "Secreto para la firma" del webhook y pegarlo en `server/.env` como `STRIPE_WEBHOOK_SECRET`.
5. Reiniciar PM2: `pm2 reload oloboc-api`.
