import { Request, Response, NextFunction } from 'express';
import { authService, AdminPayload } from '../services/auth.service.js';

export interface AuthenticatedRequest extends Request {
  admin?: AdminPayload;
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.oloboc_admin_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Acceso no autorizado: requiere autenticación de administrador' });
    }

    const admin = await authService.verifyToken(token);
    req.admin = admin;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: error.message || 'Sesión no válida o expirada' });
  }
}
