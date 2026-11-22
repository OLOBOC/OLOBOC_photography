import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { loginLimiter } from '../middleware/rate-limit.middleware.js';
import { config } from '../config.js';

const router = Router();

router.post('/login', loginLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const result = await authService.login(email, password, req.ip);

    // Set secure cookie
    res.cookie('oloboc_admin_token', result.token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token: result.token,
      admin: result.admin
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Credenciales inválidas' });
  }
});

router.post('/logout', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (req.admin?.sessionId) {
    await authService.logout(req.admin.sessionId);
  }
  res.clearCookie('oloboc_admin_token');
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

router.get('/me', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    admin: req.admin
  });
});

export default router;
