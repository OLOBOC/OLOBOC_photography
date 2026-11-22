import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';
import crypto from 'crypto';

export interface AdminPayload {
  adminUserId: string;
  sessionId: string;
  email: string;
  role: string;
}

export class AuthService {
  async login(email: string, passwordPlain: string, ipAddress?: string) {
    const cleanEmail = email.trim().toLowerCase();
    const admin = await prisma.adminUser.findUnique({ where: { email: cleanEmail } });

    if (!admin) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(passwordPlain, admin.passwordHash);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    // Create session in DB
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await prisma.session.create({
      data: {
        token: sessionToken,
        adminUserId: admin.id,
        expiresAt
      }
    });

    // Create JWT
    const payload: AdminPayload = {
      adminUserId: admin.id,
      sessionId: session.id,
      email: admin.email,
      role: admin.role
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

    // Record Audit
    await prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        entityType: 'AdminUser',
        entityId: admin.id,
        ipAddress
      }
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };
  }

  async verifyToken(token: string): Promise<AdminPayload> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AdminPayload;

      // Verify session exists and has not expired
      const session = await prisma.session.findUnique({
        where: { id: decoded.sessionId }
      });

      if (!session || session.expiresAt < new Date()) {
        throw new Error('Sesión expirada o no válida');
      }

      return decoded;
    } catch (e) {
      throw new Error('Token inválido o expirado');
    }
  }

  async logout(sessionId: string) {
    try {
      await prisma.session.delete({ where: { id: sessionId } });
    } catch (e) {
      // Ignored if session already deleted
    }
  }
}

export const authService = new AuthService();
