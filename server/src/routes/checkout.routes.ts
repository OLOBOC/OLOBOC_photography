import { Router, Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../db/prisma.js';
import { pricingService } from '../services/pricing.service.js';
import { stripeService } from '../services/stripe.service.js';
import { storageService } from '../services/storage.service.js';
import { downloadLimiter } from '../middleware/rate-limit.middleware.js';
import { config } from '../config.js';

const router = Router();

// Public: Get active commercial packs
router.get('/packs', async (req: Request, res: Response) => {
  const packs = await prisma.pack.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  const basePrice = await pricingService.getBaseUnitPriceCents();
  res.json({
    baseUnitPriceCents: basePrice,
    packs: packs.map((p) => ({
      id: p.id,
      name: p.name,
      photoCount: p.photoCount,
      priceCents: p.priceCents,
      isFeatured: p.isFeatured
    }))
  });
});

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
    const { photoIds, customerEmail, tipCents, acceptDigitalTerms } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos una fotografía' });
    }

    if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      return res.status(400).json({ error: 'Email de entrega no válido' });
    }

    if (acceptDigitalTerms === false) {
      return res.status(400).json({ error: 'Debes consentir el suministro inmediato de contenido digital conforme al Art. 103.m LGDCU' });
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

// Public: Simplified receipt / invoice with Spanish VAT breakdown
router.get('/order/:token/receipt', async (req: Request, res: Response) => {
  const { token } = req.params;
  const order = await prisma.order.findUnique({
    where: { downloadToken: token },
    include: {
      items: {
        include: {
          photo: {
            include: { event: { select: { name: true, date: true } } }
          }
        }
      }
    }
  });

  if (!order) return res.status(404).send('Pedido no encontrado');

  const netCents = Math.round(order.totalAmountCents / 1.21);
  const vatCents = order.totalAmountCents - netCents;
  const dateFormatted = new Date(order.createdAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Recibo Simplificado ${order.orderNumber} — OLOBOC_</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #fff; color: #111; margin: 40px; }
    .header { border-bottom: 2px solid #E8431F; padding-bottom: 20px; display: flex; justify-content: space-between; }
    .logo { font-size: 28px; font-weight: 900; }
    .badge { color: #E8431F; font-weight: bold; font-family: monospace; font-size: 13px; }
    .box { border: 1px solid #ddd; padding: 16px; margin: 20px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
    th { background: #f8f8f8; font-size: 11px; text-transform: uppercase; }
    .totals { margin-top: 20px; text-align: right; font-size: 14px; }
    .totals tr td { border: none; padding: 4px 10px; }
    .total-row { font-size: 18px; font-weight: bold; color: #E8431F; }
    .footer { font-size: 11px; color: #777; margin-top: 40px; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { margin: 0; } .btn-print { display: none; } }
  </style>
</head>
<body>
  <div style="margin-bottom: 20px;" class="btn-print">
    <button onclick="window.print()" style="background: #E8431F; color: #fff; border: none; padding: 8px 16px; font-weight: bold; cursor: pointer;">
      🖨 IMPRIMIR O GUARDAR EN PDF
    </button>
  </div>
  <div class="header">
    <div>
      <div class="logo">OLOBOC_</div>
      <div style="font-size: 12px; color: #555; margin-top: 4px;">Fotografía Deportiva de Competición · Motorsport</div>
      <div style="font-size: 11px; color: #888;">Tecnología: Nortcode (https://www.nortcode.es)</div>
    </div>
    <div style="text-align: right;">
      <div class="badge">DOCUMENTO JUSTIFICATIVO DE COMPRA</div>
      <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Factura Simplificada: SIMP-${order.orderNumber}</div>
      <div style="font-size: 12px; color: #666;">Fecha: ${dateFormatted}</div>
    </div>
  </div>

  <div class="box">
    <strong>Datos del Cliente:</strong><br>
    Email: ${order.customerEmail}<br>
    Referencia del pedido: ${order.orderNumber}<br>
    Estado de pago: ${order.status === 'PAID' ? 'PAGADO ✓' : order.status}
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th>Evento</th>
        <th style="text-align: right;">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map((it) => `
        <tr>
          <td>Licencia digital de alta resolución: ${it.photo.originalFilename}</td>
          <td>${it.photo.event.name}</td>
          <td style="text-align: right;">${(it.priceCents / 100).toFixed(2)} €</td>
        </tr>
      `).join('')}
      ${order.tipAmountCents > 0 ? `
        <tr>
          <td>Aportación voluntaria al proyecto de fotografía de competición</td>
          <td>-</td>
          <td style="text-align: right;">${(order.tipAmountCents / 100).toFixed(2)} €</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="totals">
    <table style="width: auto; margin-left: auto;">
      <tr>
        <td>Base Imponible:</td>
        <td style="text-align: right; width: 100px;">${(netCents / 100).toFixed(2)} €</td>
      </tr>
      <tr>
        <td>IVA (21% incluido):</td>
        <td style="text-align: right;">${(vatCents / 100).toFixed(2)} €</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL:</td>
        <td style="text-align: right;">${(order.totalAmountCents / 100).toFixed(2)} €</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>Operación de prestación de servicios digitales por vía electrónica efectuada con arreglo al Real Decreto 1619/2012 (Reglamento de Facturación en España). Los precios exhibidos al consumidor final incluyen el Impuesto sobre el Valor Añadido (IVA al 21%).</p>
    <p>Contacto: contacto@oloboc.com · Plataforma web: https://oloboc.com</p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
