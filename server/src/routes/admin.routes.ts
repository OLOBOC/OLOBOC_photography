import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ocrQueueService } from '../services/queue.service.js';
import { stripeService } from '../services/stripe.service.js';

const router = Router();

// Protect all admin endpoints
router.use(requireAdmin);

// Dashboard KPIs and real analytics
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const [
    totalEvents,
    publishedEvents,
    totalPhotos,
    publishedPhotos,
    pendingBibReviews,
    totalOrders,
    paidOrders,
    revenueData,
    recentActivity,
    recentOrders
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { status: 'PUBLISHED' } }),
    prisma.photo.count(),
    prisma.photo.count({ where: { isPublished: true } }),
    prisma.bibDetection.count({ where: { status: 'DETECTED', confidence: { lt: 0.75 } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmountCents: true }
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { adminUser: { select: { name: true, email: true } } }
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerEmail: true,
        totalAmountCents: true,
        status: true,
        createdAt: true,
        _count: { select: { items: true } }
      }
    })
  ]);

  const grossRevenueCents = revenueData._sum.totalAmountCents || 0;

  // Photos per season
  const events = await prisma.event.findMany({
    select: {
      season: true,
      _count: { select: { photos: true } }
    }
  });

  const photosBySeasonMap: Record<number, number> = {};
  for (const ev of events) {
    photosBySeasonMap[ev.season] = (photosBySeasonMap[ev.season] || 0) + ev._count.photos;
  }

  const photosBySeason = Object.entries(photosBySeasonMap).map(([year, count]) => ({
    year: parseInt(year, 10),
    count
  }));

  res.json({
    kpis: {
      totalEvents,
      publishedEvents,
      draftEvents: totalEvents - publishedEvents,
      totalPhotos,
      publishedPhotos,
      pendingBibReviews,
      totalOrders,
      paidOrders,
      grossRevenueCents,
      grossRevenueFormatted: `${(grossRevenueCents / 100).toFixed(2)} €`
    },
    photosBySeason,
    recentActivity,
    recentOrders
  });
});

// Admin: Events list for administration
router.get('/events', async (req: AuthenticatedRequest, res: Response) => {
  const events = await prisma.event.findMany({
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { photos: true } },
      photos: {
        where: { isCover: true },
        take: 1,
        select: { storageKeyThumbnail: true }
      }
    }
  });

  res.json({
    events: events.map((e) => ({
      ...e,
      photoCount: e._count.photos,
      coverThumb: e.photos[0] ? `/api/photos/thumb/${e.photos[0].storageKeyThumbnail}` : null
    }))
  });
});

// Admin: Photos list for a specific event
router.get('/events/:id/photos', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const photos = await prisma.photo.findMany({
    where: { eventId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      bibDetections: true
    }
  });

  res.json({
    photos: photos.map((p) => ({
      id: p.id,
      filename: p.originalFilename,
      previewUrl: `/api/photos/preview/${p.storageKeyPreview}`,
      thumbnailUrl: `/api/photos/thumb/${p.storageKeyThumbnail}`,
      width: p.width,
      height: p.height,
      isCover: p.isCover,
      isPublished: p.isPublished,
      isCommercial: p.isCommercial,
      downloadCount: p.downloadCount,
      bibDetections: p.bibDetections
    }))
  });
});

// Admin: Bib Review Queue with Status & Event Filtering
router.get('/bib-review', async (req: AuthenticatedRequest, res: Response) => {
  const { status = 'DETECTED', eventId, page = '1', limit = '60' } = req.query;

  const where: any = {};
  if (status && typeof status === 'string' && status !== 'ALL') {
    where.status = status;
  }
  if (eventId && typeof eventId === 'string' && eventId !== 'all') {
    where.photo = { eventId };
  }

  const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 60));
  const skip = (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

  const [pendingCount, totalDetections, detections] = await Promise.all([
    prisma.bibDetection.count({ where: { status: 'DETECTED' } }),
    prisma.bibDetection.count({ where }),
    prisma.bibDetection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        photo: {
          include: {
            event: { select: { id: true, name: true, slug: true } }
          }
        }
      }
    })
  ]);

  res.json({
    pendingCount,
    totalCount: totalDetections,
    page: parseInt(String(page), 10) || 1,
    limit: take,
    detections: detections.map((d) => ({
      id: d.id,
      bibNumber: d.bibNumber,
      confidence: d.confidence,
      bbox: { x: d.bboxX, y: d.bboxY, w: d.bboxW, h: d.bboxH },
      cropBase64: d.cropBase64,
      status: d.status,
      detectedBy: d.detectedBy,
      photoId: d.photo.id,
      photoFilename: d.photo.originalFilename,
      previewUrl: `/api/photos/preview/${d.photo.storageKeyPreview}`,
      thumbnailUrl: `/api/photos/thumb/${d.photo.storageKeyThumbnail}`,
      eventId: d.photo.event.id,
      eventName: d.photo.event.name
    }))
  });
});

// Admin: Batch confirm multiple detections
router.post('/bib-review/batch-confirm', async (req: AuthenticatedRequest, res: Response) => {
  const { detectionIds } = req.body;
  if (!Array.isArray(detectionIds) || detectionIds.length === 0) {
    return res.status(400).json({ error: 'Lista de IDs no proporcionada' });
  }

  const result = await prisma.bibDetection.updateMany({
    where: { id: { in: detectionIds } },
    data: { status: 'CONFIRMED' }
  });

  res.json({ success: true, count: result.count });
});

// Admin: Batch reject multiple detections (e.g. false positives/sponsor stickers)
router.post('/bib-review/batch-reject', async (req: AuthenticatedRequest, res: Response) => {
  const { detectionIds } = req.body;
  if (!Array.isArray(detectionIds) || detectionIds.length === 0) {
    return res.status(400).json({ error: 'Lista de IDs no proporcionada' });
  }

  const result = await prisma.bibDetection.updateMany({
    where: { id: { in: detectionIds } },
    data: { status: 'REJECTED' }
  });

  res.json({ success: true, count: result.count });
});

// Admin: Reprocess Vision AI on all or pending photos of an event
router.post('/events/:id/reprocess-ocr', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { forceAll = false } = req.body;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

  const { queuedCount } = await ocrQueueService.enqueueEvent(id, forceAll);
  res.json({ success: true, message: `${queuedCount} fotos encoladas para procesamiento de visión artificial`, queuedCount });
});

// Admin: Check real-time progress of OCR processing for an event
router.get('/events/:id/ocr-progress', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const progress = await ocrQueueService.getEventProgress(id);
  res.json(progress);
});

// Admin: Reprocess Vision AI for a single photo
router.post('/photos/:id/reprocess-ocr', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada' });

  await ocrQueueService.enqueue(photo.id, photo.eventId);
  res.json({ success: true, message: 'Foto encolada para reconocimiento' });
});

// Admin: Orders list with search, status filtering & pagination
router.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
  const { status, search, page = '1', limit = '50' } = req.query;

  const where: any = {};
  if (status && typeof status === 'string' && status !== 'all') {
    where.status = status;
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q } },
      { customerEmail: { contains: q.toLowerCase() } }
    ];
  }

  const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const skip = (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        items: {
          include: {
            photo: {
              select: { id: true, originalFilename: true, storageKeyThumbnail: true }
            }
          }
        }
      }
    })
  ]);

  res.json({
    orders,
    pagination: {
      totalCount,
      page: parseInt(String(page), 10) || 1,
      limit: take,
      totalPages: Math.ceil(totalCount / take)
    }
  });
});

// Admin: Email logs for orders
router.get('/orders/email-logs', async (req: AuthenticatedRequest, res: Response) => {
  const logs = await prisma.emailLog.findMany({
    take: 50,
    orderBy: { sentAt: 'desc' }
  });
  res.json({ logs });
});

// Admin: Refund order with pasarela & digital access revocation
router.post('/orders/:id/refund', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const result = await stripeService.refundOrder(id, reason);

    await prisma.auditLog.create({
      data: {
        adminUserId: req.admin?.adminUserId,
        action: 'ORDER_REFUNDED',
        entityType: 'Order',
        entityId: id,
        details: `Reembolso procesado para pedido ${result.order.orderNumber} (${(result.order.totalAmountCents / 100).toFixed(2)} €). Motivo: ${reason || 'Administrativo'}`
      }
    });

    res.json({ success: true, order: result.order, stripeRefundId: result.stripeRefundId, isDevSimulation: result.isDevSimulation });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al procesar el reembolso' });
  }
});

// Admin: System Settings
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  const settings = await prisma.systemSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  res.json({ settings: map });
});

router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Formato de configuración inválido' });
  }

  for (const [key, val] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(val) },
      create: { key, value: String(val) }
    });
  }

  await prisma.auditLog.create({
    data: {
      adminUserId: req.admin?.adminUserId,
      action: 'SYSTEM_SETTINGS_UPDATED',
      entityType: 'SystemSetting',
      details: JSON.stringify(settings)
    }
  });

  res.json({ success: true });
});

// Admin: Packs Management
router.get('/packs', async (req: AuthenticatedRequest, res: Response) => {
  const packs = await prisma.pack.findMany({ orderBy: { photoCount: 'asc' } });
  res.json({ packs });
});

router.post('/packs', async (req: AuthenticatedRequest, res: Response) => {
  const { name, photoCount, priceCents, isFeatured, isActive } = req.body;

  if (!name || !photoCount || !priceCents) {
    return res.status(400).json({ error: 'Nombre, número de fotos y precio requeridos' });
  }

  const pack = await prisma.pack.create({
    data: {
      name: name.trim(),
      photoCount: parseInt(photoCount, 10),
      priceCents: parseInt(priceCents, 10),
      isFeatured: !!isFeatured,
      isActive: isActive !== undefined ? !!isActive : true
    }
  });

  res.status(201).json(pack);
});

router.put('/packs/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, photoCount, priceCents, isFeatured, isActive } = req.body;

  const updated = await prisma.pack.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(photoCount !== undefined ? { photoCount: parseInt(photoCount, 10) } : {}),
      ...(priceCents !== undefined ? { priceCents: parseInt(priceCents, 10) } : {}),
      ...(isFeatured !== undefined ? { isFeatured: !!isFeatured } : {}),
      ...(isActive !== undefined ? { isActive: !!isActive } : {})
    }
  });

  res.json(updated);
});

router.delete('/packs/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await prisma.pack.delete({ where: { id } });
  res.json({ success: true });
});

// Admin: Image Rights Takedown Requests
router.get('/takedowns', async (req: AuthenticatedRequest, res: Response) => {
  const takedowns = await prisma.takedownRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      photo: {
        include: { event: { select: { name: true } } }
      }
    }
  });

  res.json({ takedowns });
});

router.put('/takedowns/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  const takedown = await prisma.takedownRequest.findUnique({ where: { id } });
  if (!takedown) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const updated = await prisma.takedownRequest.update({
    where: { id },
    data: {
      status,
      adminNotes
    }
  });

  // If approved to remove/hide, unpublish photo immediately
  if (status === 'ACCEPTED_HIDDEN') {
    await prisma.photo.update({
      where: { id: takedown.photoId },
      data: { isPublished: false, isCommercial: false }
    });
  }

  res.json(updated);
});

export default router;
