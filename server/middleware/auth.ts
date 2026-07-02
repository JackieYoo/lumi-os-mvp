import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { UnauthorizedError } from '../lib/errors.js';

export interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return next(new UnauthorizedError('Missing authorization token'));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { id: string; username: string };
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
