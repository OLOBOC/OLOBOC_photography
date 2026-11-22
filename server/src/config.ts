import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_oloboc_motorsport_2026_super_secure_entropy',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  storageDriver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './storage'),
  adminInitialEmail: process.env.ADMIN_INITIAL_EMAIL || 'admin@oloboc.com',
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'Admin_Oloboc_2026!',
  contactForwardEmail: process.env.CONTACT_FORWARD_EMAIL || 'contacto@oloboc.com',
  watermark: {
    text: 'OLOBOC_',
    opacity: 0.28,
    angle: -30,
    fontSize: 48,
    color: '#ffffff'
  }
};
