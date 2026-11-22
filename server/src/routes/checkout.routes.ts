import { Router, Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../db/prisma.js';
import { pricingService } from '../services/pricing.service.js';
import { stripeService } from '../services/stripe.service.js';
import { storageService } from '../services/storage.service.js';
import { downloadLimiter } from '../middleware/rate-limit.middleware.js';
import { config } from '../config.js';

const router = Router();

// Public: Get live price quote with pack optimization
router.post('/quote', async (req: Request, res: Response, next) => {
  try {
    const { photoIds, tipCents } = req.body;

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'photoIds debe ser un array de identificadores' });
    }

    const quote = await pricingService.calculateQuote(photoIds, tipCents);
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error calculando presupuesto' });
  }
});

// Public: Create Stripe Checkout Session
router.post('/create-session', async (req: Request, res: Response, next) => {
  try {
    const { photoIds, customerEmail, tipCents } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos una fotografía' });
    }

    if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      return res.status(400).json({ error: 'Email de entrega no válido' });
    }

    const sessionData = await stripeService.createCheckoutSession({
      photoIds,
      customerEmail,
      tipCents,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(sessionData);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error iniciando pasarela de pago' });
  }
});

// Stripe Webhook handler (must receive raw body Buffer)
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing stripe-signature header');
  }

  try {
    const result = await stripeService.handleWebhook(req.body, sig);
    res.json(result);
  } catch (err: any) {
    console.error('[Stripe Webhook Error]', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Development test helper to simulate successful payment
router.post('/dev-simulate-success', async (req: Request, res: Response) => {
  if (config.isProduction) {
    return res.status(403).json({ error: 'No disponible en entorno de producción' });
  }

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  try {
    const order = await stripeService.simulatePaymentCompletion(token);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Public: Lookup order by download token
router.get('/order/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  const order = await prisma.order.findUnique({
    where: { downloadToken: token },
    include: {
      items: {
        include: {
          photo: {
            include: {
              event: {
                select: { name: true, location: true, date: true }
              }
            }
          }
        }
      }
    }
  });

  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado o enlace caducado' });
  }

  const isExpired = new Date() > order.downloadExpiresAt;
  const isPaid = order.status === 'PAID';

  res.json({
    orderNumber: order.orderNumber,
    customerEmail: order.customerEmail,
    status: order.status,
    isPaid,
    isExpired,
    totalAmountCents: order.totalAmountCents,
    appliedPackName: order.appliedPackName,
    downloadCount: order.downloadCount,
    maxDownloads: order.maxDownloads,
    downloadExpiresAt: order.downloadExpiresAt,
    items: order.items.map((it) => ({
      photoId: it.photo.id,
      filename: it.photo.originalFilename,
      previewUrl: `/api/photos/preview/${it.photo.storageKeyPreview}`,
      thumbnailUrl: `/api/photos/thumb/${it.photo.storageKeyThumbnail}`,
      eventName: it.photo.event.name,
      width: it.photo.width,
      height: it.photo.height,
      downloadUrl: isPaid && !isExpired ? `/api/checkout/order/${token}/download/${it.photo.id}` : null
    }))
  });
});

// Public: Guest Order recovery by email and orderNumber
router.post('/lookup', async (req: Request, res: Response) => {
  const { email, orderNumber } = req.body;

  if (!email || !orderNumber) {
    return res.status(400).json({ error: 'Indica el email de compra y el número de pedido' });
  }

  const order = await prisma.order.findFirst({
    where: {
      customerEmail: email.trim().toLowerCase(),
      orderNumber: orderNumber.trim()
    }
  });

  if (!order) {
    return res.status(404).json({ error: 'No se ha encontrado ningún pedido con esos datos' });
  }

  res.json({
    success: true,
    downloadToken: order.downloadToken,
    orderNumber: order.orderNumber,
    status: order.status
  });
});

// Protected: Secure download endpoint with strict entitlement check
router.get('/order/:token/download/:photoId', downloadLimiter, async (req: Request, res: Response) => {
  const { token, photoId } = req.params;

  const order = await prisma.order.findUnique({
    where: { downloadToken: token },
    include: { items: true }
  });

  if (!order) {
    return res.status(404).send('Enlace de descarga inválido');
  }

  if (order.status !== 'PAID') {
    return res.status(403).send('El pago del pedido no ha sido confirmado');
  }

  if (new Date() > order.downloadExpiresAt) {
    return res.status(403).send('El plazo de descarga de este pedido ha expirado (7 días)');
  }

  if (order.downloadCount >= order.maxDownloads) {
    return res.status(403).send('Se ha alcanzado el límite de descargas autorizadas para este pedido');
  }

  const hasPhoto = order.items.some((it) => it.photoId === photoId);
  if (!hasPhoto) {
    return res.status(403).send('Esta fotografía no forma parte del pedido adquirido');
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) {
    return res.status(404).send('Fotografía no encontrada');
  }

  const originalPath = storageService.getOriginalPath(photo.storageKeyOriginal);
  if (!fs.existsSync(originalPath)) {
    return res.status(404).send('Archivo original no disponible en almacenamiento');
  }

  // Atomically increment download counts
  await prisma.order.update({
    where: { id: order.id },
    data: { downloadCount: { increment: 1 } }
  });

  await prisma.photo.update({
    where: { id: photo.id },
    data: { downloadCount: { increment: 1 } }
  });

  console.log(`[Download] High-res clean original downloaded: ${photo.originalFilename} by order ${order.orderNumber}`);

  res.setHeader('Content-Type', photo.mimeType || 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="OLOBOC_${photo.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  fs.createReadStream(originalPath).pipe(res);
});

export default router;
