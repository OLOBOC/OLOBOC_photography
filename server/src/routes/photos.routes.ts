import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma.js';
import { imageService } from '../services/image.service.js';
import { storageService } from '../services/storage.service.js';
import { bibRecognitionService } from '../services/ocr.service.js';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Multer memory storage with file type filtering & size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
    files: 20 // 20 files per batch
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Solo se aceptan imágenes JPEG, PNG o WebP.'));
    }
  }
});

// Public: Search photos by car bib number
router.get('/search-bib', async (req: Request, res: Response, next) => {
  try {
    const { bib, eventId } = req.query;

    if (!bib || typeof bib !== 'string') {
      return res.json({ results: [] });
    }

    const cleanBib = bib.trim().replace(/^0+/, '') || '0';

    const whereDetections: any = {
      bibNumber: cleanBib,
      status: { in: ['CONFIRMED', 'MANUAL', 'DETECTED'] },
      photo: {
        isPublished: true
      }
    };

    if (eventId && typeof eventId === 'string' && eventId !== 'all') {
      whereDetections.photo.eventId = eventId;
    }

    const detections = await prisma.bibDetection.findMany({
      where: whereDetections,
      include: {
        photo: {
          include: {
            event: {
              select: { id: true, name: true, slug: true, location: true, date: true }
            }
          }
        }
      },
      take: 50
    });

    const results = detections.map((d) => ({
      detectionId: d.id,
      bibNumber: d.bibNumber,
      confidence: d.confidence,
      photoId: d.photo.id,
      previewUrl: `/api/photos/preview/${d.photo.storageKeyPreview}`,
      thumbnailUrl: `/api/photos/thumb/${d.photo.storageKeyThumbnail}`,
      width: d.photo.width,
      height: d.photo.height,
      eventName: d.photo.event.name,
      eventSlug: d.photo.event.slug,
      eventLocation: d.photo.event.location,
      eventDate: d.photo.event.date
    }));

    res.json({ count: results.length, bib: cleanBib, results });
  } catch (err) {
    next(err);
  }
});

// Public: Stream watermarked preview image
router.get('/preview/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const safeFilename = path.basename(key);
  const filePath = storageService.getPreviewPath(safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Imagen no encontrada');
  }

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  fs.createReadStream(filePath).pipe(res);
});

// Public: Stream thumbnail image
router.get('/thumb/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const safeFilename = path.basename(key);
  const filePath = storageService.getThumbnailPath(safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Miniatura no encontrada');
  }

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  fs.createReadStream(filePath).pipe(res);
});

// Admin: Upload batch of photos to an event
router.post(
  '/admin/upload',
  requireAdmin,
  upload.array('photos', 20),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { eventId, watermarkText } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!eventId) {
        return res.status(400).json({ error: 'Debes seleccionar un evento para subir fotografías' });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      const processedPhotos = [];

      for (const file of files) {
        const fileId = uuidv4();
        // 1. Process image variants (sharp, watermark, thumb)
        const variants = await imageService.processUpload(
          file.buffer,
          file.originalname,
          fileId,
          watermarkText
        );

        // 2. Persist Photo record
        const photo = await prisma.photo.create({
          data: {
            id: fileId,
            eventId,
            originalFilename: variants.originalFilename,
            storageKeyOriginal: variants.storageKeyOriginal,
            storageKeyWatermarked: variants.storageKeyWatermarked,
            storageKeyPreview: variants.storageKeyPreview,
            storageKeyThumbnail: variants.storageKeyThumbnail,
            mimeType: variants.mimeType,
            sizeBytes: variants.sizeBytes,
            width: variants.width,
            height: variants.height,
            isCover: false,
            isPublished: true,
            isCommercial: true
          }
        });

        // 3. Run OCR detection pipeline on the original buffer
        const detectedBibs = await bibRecognitionService.processAndSavePhotoBibs(photo.id, file.buffer);

        processedPhotos.push({
          id: photo.id,
          filename: photo.originalFilename,
          thumbnailUrl: `/api/photos/thumb/${photo.storageKeyThumbnail}`,
          previewUrl: `/api/photos/preview/${photo.storageKeyPreview}`,
          detectedBibs: detectedBibs.map((b) => ({ bibNumber: b.bibNumber, confidence: b.confidence }))
        });
      }

      res.status(201).json({
        success: true,
        count: processedPhotos.length,
        photos: processedPhotos
      });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Toggle photo cover for event
router.post('/admin/:id/cover', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return res.status(404).json({ error: 'Foto no encontrada' });

    // Unset current event covers
    await prisma.photo.updateMany({
      where: { eventId: photo.eventId },
      data: { isCover: false }
    });

    // Set this photo as cover
    const updated = await prisma.photo.update({
      where: { id },
      data: { isCover: true }
    });

    await prisma.event.update({
      where: { id: photo.eventId },
      data: { coverPhotoId: photo.id }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Admin: Add or edit bib manual association
router.post('/admin/:id/bibs', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { bibNumber } = req.body;

    if (!bibNumber) {
      return res.status(400).json({ error: 'El número de dorsal es obligatorio' });
    }

    const cleanBib = String(bibNumber).trim().replace(/^0+/, '') || '0';

    const detection = await prisma.bibDetection.create({
      data: {
        photoId: id,
        bibNumber: cleanBib,
        confidence: 1.0,
        status: 'MANUAL',
        detectedBy: 'MANUAL'
      }
    });

    res.status(201).json(detection);
  } catch (err) {
    next(err);
  }
});

// Admin: Remove bib detection
router.delete('/admin/bibs/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    await prisma.bibDetection.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Admin: Confirm bib detection
router.put('/admin/bibs/:id/confirm', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { bibNumber } = req.body;

    const updated = await prisma.bibDetection.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        ...(bibNumber ? { bibNumber: String(bibNumber).trim() } : {})
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Admin: Delete photo and all derivatives
router.delete('/admin/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return res.status(404).json({ error: 'Foto no encontrada' });

    // Remove files from storage
    await storageService.deletePhotoFiles({
      original: photo.storageKeyOriginal,
      watermarked: photo.storageKeyWatermarked,
      preview: photo.storageKeyPreview,
      thumbnail: photo.storageKeyThumbnail
    });

    // Remove from DB
    await prisma.photo.delete({ where: { id } });

    res.json({ success: true, message: 'Fotografía eliminada' });
  } catch (err) {
    next(err);
  }
});

export default router;
