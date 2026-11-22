import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Demasiados intentos de acceso. Por seguridad, inténtalo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados envíos de formulario. Por favor, espera unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

export const downloadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: { error: 'Límite de descargas concurrentes alcanzado temporalmente.' },
  standardHeaders: true,
  legacyHeaders: false
});

export const apiGeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes. Ralentiza tu navegación.' },
  standardHeaders: true,
  legacyHeaders: false
});
