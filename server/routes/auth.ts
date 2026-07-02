import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';
import { createUser, findUserByUsername } from '../db/users.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(6),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const { username, password } = registerSchema.parse(req.body);
    const existing = await findUserByUsername(username);
    if (existing) {
      throw new AppError(409, 'Username already exists', 'USERNAME_EXISTS');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await createUser({
      id,
      username,
      password_hash: await hashPassword(password),
      created_at: now,
      updated_at: now,
    });

    const token = signToken({ id, username });
    res.status(201).json({
      success: true,
      data: { user: { id, username }, token },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await findUserByUsername(username);
    if (!user) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const token = signToken({ id: user.id, username: user.username });
    res.json({
      success: true,
      data: { user: { id: user.id, username: user.username }, token },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

authRouter.post('/password', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
    const user = await findUserByUsername(req.user!.username);
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'Current password is incorrect', 'INVALID_PASSWORD');
    }

    const password_hash = await hashPassword(newPassword);
    // Update password hash using raw db access through createUser pattern is not ideal,
    // but for MVP we use a direct update helper below
    const { getDb } = await import('../db/connection.js');
    const db = await getDb();
    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [
      password_hash,
      new Date().toISOString(),
      user.id,
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/export', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { listMemoriesByUser } = await import('../db/memories.js');
    const { listSessionsByUser } = await import('../db/sessions.js');
    const { listMessagesBySession } = await import('../db/messages.js');

    const memories = await listMemoriesByUser(req.user!.id, 10000);
    const sessions = await listSessionsByUser(req.user!.id, 10000);

    const messagesBySession = await Promise.all(
      sessions.map(async (session) => ({
        session,
        messages: await listMessagesBySession(session.id),
      }))
    );

    res.json({
      success: true,
      data: {
        user: req.user,
        memories,
        sessions: messagesBySession,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});
