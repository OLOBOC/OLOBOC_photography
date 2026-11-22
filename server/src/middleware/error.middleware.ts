import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Unhandled Error]', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: message,
    ...(config.isProduction ? {} : { stack: err.stack })
  });
}
