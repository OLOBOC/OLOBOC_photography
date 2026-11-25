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
  email: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpSecure: process.env.SMTP_SECURE === 'true',
    fromEmail: process.env.SMTP_FROM || 'OLOBOC_ Motorsport <pedidos@oloboc.com>',
    isConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER)
  },
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    publicCdnUrl: process.env.S3_PUBLIC_CDN_URL || '',
    isConfigured: !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
  },
  watermark: {
    text: 'OLOBOC_',
    opacity: 0.28,
    angle: -30,
    fontSize: 48,
    color: '#ffffff'
  }
};
