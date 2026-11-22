import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Public: List all published events
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { category, season, query } = req.query;

    const where: any = { status: 'PUBLISHED' };

    if (category && category !== 'Todas') {
      where.category = { contains: String(category) };
    }

    if (season && season !== 'all') {
      where.season = parseInt(String(season), 10);
    }

    if (query) {
      where.name = { contains: String(query) };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        _count: {
          select: { photos: { where: { isPublished: true } } }
        },
        photos: {
          where: { isPublished: true },
          take: 1,
          select: {
            id: true,
            storageKeyPreview: true,
            storageKeyThumbnail: true,
            isCover: true
          }
        }
      }
    });

    const formatted = events.map((e) => {
      const coverPhoto = e.photos.find((p) => p.isCover) || e.photos[0];
      return {
        id: e.id,
        slug: e.slug,
        name: e.name,
        location: e.location,
        date: e.date,
        season: e.season,
        category: e.category,
        description: e.description,
        photoCount: e._count.photos,
        coverPhoto: coverPhoto
          ? {
              previewUrl: `/api/photos/preview/${coverPhoto.storageKeyPreview}`,
              thumbnailUrl: `/api/photos/thumb/${coverPhoto.storageKeyThumbnail}`
            }
          : null
      };
    });

    res.json({ events: formatted });
  } catch (err) {
    next(err);
  }
});

// Public: Get event details with photos
router.get('/:slug', async (req: Request, res: Response, next) => {
  try {
    const { slug } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      include: {
        photos: {
          where: { isPublished: true },
          orderBy: { createdAt: 'asc' },
          include: {
            bibDetections: {
              where: { status: { in: ['CONFIRMED', 'MANUAL', 'DETECTED'] } },
              select: { bibNumber: true, confidence: true, status: true }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Increment view count
    await prisma.event.update({
      where: { id: event.id },
      data: { viewCount: { increment: 1 } }
    });

    const coverPhoto = event.photos.find((p) => p.isCover) || event.photos[0];

    const formatted = {
      id: event.id,
      slug: event.slug,
      name: event.name,
      location: event.location,
      date: event.date,
      season: event.season,
      category: event.category,
      description: event.description,
      status: event.status,
      coverPhoto: coverPhoto
        ? {
            previewUrl: `/api/photos/preview/${coverPhoto.storageKeyPreview}`,
            thumbnailUrl: `/api/photos/thumb/${coverPhoto.storageKeyThumbnail}`
          }
        : null,
      photos: event.photos.map((p) => ({
        id: p.id,
        filename: p.originalFilename,
        previewUrl: `/api/photos/preview/${p.storageKeyPreview}`,
        thumbnailUrl: `/api/photos/thumb/${p.storageKeyThumbnail}`,
        width: p.width,
        height: p.height,
        isCover: p.isCover,
        isCommercial: p.isCommercial,
        bibs: p.bibDetections.map((b) => b.bibNumber)
      }))
    };

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// Admin: Create Event
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { name, location, date, category, description, status } = req.body;
    if (!name || !location || !date) {
      return res.status(400).json({ error: 'Nombre, localización y fecha son obligatorios' });
    }

    const eventDate = new Date(date);
    const season = eventDate.getFullYear();
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const slug = `${baseSlug}-${season}-${Date.now().toString().slice(-4)}`;

    const event = await prisma.event.create({
      data: {
        slug,
        name: name.trim(),
        location: location.trim(),
        date: eventDate,
        season,
        category: category || 'Rally',
        description: description || '',
        status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
      }
    });

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

// Admin: Update Event
router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { name, location, date, category, description, status } = req.body;

    const data: any = {};
    if (name) data.name = name.trim();
    if (location) data.location = location.trim();
    if (date) {
      data.date = new Date(date);
      data.season = data.date.getFullYear();
    }
    if (category) data.category = category;
    if (description !== undefined) data.description = description;
    if (status) data.status = status;

    const updated = await prisma.event.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Admin: Delete Event
import { storageService } from '../services/storage.service.js';

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    // Fetch and clean up all associated photo files on disk
    const eventPhotos = await prisma.photo.findMany({
      where: { eventId: id },
      select: {
        storageKeyOriginal: true,
        storageKeyWatermarked: true,
        storageKeyPreview: true,
        storageKeyThumbnail: true
      }
    });

    for (const p of eventPhotos) {
      await storageService.deletePhotoFiles({
        original: p.storageKeyOriginal,
        watermarked: p.storageKeyWatermarked,
        preview: p.storageKeyPreview,
        thumbnail: p.storageKeyThumbnail
      });
    }

    await prisma.event.delete({ where: { id } });
    res.json({ success: true, message: 'Evento y archivos asociados eliminados correctamente' });
  } catch (err) {
    next(err);
  }
});

export default router;
