import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { apiGeneralLimiter } from './middleware/rate-limit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import eventsRoutes from './routes/events.routes.js';
import photosRoutes from './routes/photos.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import contactRoutes from './routes/contact.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", config.clientUrl, 'https://api.stripe.com'],
        frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com']
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

// Stripe Webhook needs RAW buffer - MUST be registered BEFORE express.json()
app.use(
  '/api/checkout/webhook',
  express.raw({ type: 'application/json' })
);

// Standard parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// General rate limiter
app.use('/api', apiGeneralLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'OLOBOC_ Motorsport Photography API',
    tech: 'Developed by Nortcode',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Serve built frontend in production / unified mode
import path from 'path';
import fs from 'fs';

const clientDistPath = path.resolve('../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized Error Handler
app.use(errorHandler);

// Start Server
const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`  OLOBOC_ MOTORSPORT PHOTOGRAPHY PLATFORM`);
  console.log(`  Technology Partner: Nortcode (https://www.nortcode.es)`);
  console.log(`  Backend API running on: http://localhost:${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Storage: ${config.storageDriver} (${config.uploadDir})`);
  console.log(`====================================================`);
});

export default app;
