import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { id: string; username: string }): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; username: string } {
  return jwt.verify(token, config.JWT_SECRET) as { id: string; username: string };
}
