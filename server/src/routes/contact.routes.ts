import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { contactLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

router.post('/', contactLimiter, async (req: Request, res: Response) => {
  try {
    const { n, e, r, m, ok, web, photoId } = req.body;

    // Honeypot check (hidden input 'web')
    if (web) {
      console.warn('[Contact Spam] Honeypot triggered, silently dropping spam submission.');
      return res.json({ success: true, message: 'Mensaje recibido' });
    }

    if (!n || !n.trim()) {
      return res.status(400).json({ error: 'Indica tu nombre.' });
    }

    if (!e || !/^\S+@\S+\.\S+$/.test(e.trim())) {
      return res.status(400).json({ error: 'Email no válido.' });
    }

    if (!r) {
      return res.status(400).json({ error: 'Selecciona un motivo de consulta.' });
    }

    if (!m || m.trim().length < 10) {
      return res.status(400).json({ error: 'El mensaje debe contener al menos 10 caracteres.' });
    }

    if (!ok) {
      return res.status(400).json({ error: 'Debes aceptar la política de privacidad.' });
    }

    // 1. Create Contact Message in database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: n.trim(),
        email: e.trim().toLowerCase(),
        motive: r,
        message: m.trim(),
        ipAddress: req.ip
      }
    });

    // 2. If motive is image rights takedown / review, create formal TakedownRequest
    if (r === 'Derechos de imagen / retirada' || r.includes('retirada')) {
      if (photoId) {
        await prisma.takedownRequest.create({
          data: {
            contactMessageId: contactMessage.id,
            photoId: String(photoId),
            requesterName: n.trim(),
            requesterEmail: e.trim().toLowerCase(),
            reason: m.trim(),
            status: 'PENDING'
          }
        });
        console.log(`[Takedown Request] Created formal image rights review request for photo ${photoId}`);
      }
    }

    res.json({
      success: true,
      message: 'Tu mensaje ha sido enviado correctamente. Responderemos a la mayor brevedad.'
    });
  } catch (err: any) {
    console.error('[Contact Error]', err);
    res.status(500).json({ error: 'Error al procesar tu mensaje. Inténtalo de nuevo más tarde.' });
  }
});

export default router;
