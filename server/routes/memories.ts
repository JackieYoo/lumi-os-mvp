import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import {
  listMemoriesByUser,
  searchMemoriesByKeyword,
  findMemoryById,
  updateMemory,
  deleteMemory,
} from '../db/memories.js';
import { buildMemoryTree } from '../memory/tree.js';

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.string().default('50').transform(Number),
  offset: z.string().default('0').transform(Number),
});

const updateSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  importance: z.number().int().min(1).max(10).optional(),
});

export const memoryRouter = Router();

memoryRouter.use(requireAuth);

memoryRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { q, limit, offset } = querySchema.parse(req.query);
    const userId = req.user!.id;

    const memories = q
      ? await searchMemoriesByKeyword(userId, q, limit)
      : await listMemoriesByUser(userId, limit);

    const paginated = memories.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginated,
      meta: { total: memories.length, limit, offset },
    });
  } catch (err) {
    next(err);
  }
});

memoryRouter.get('/tree', async (req: AuthRequest, res, next) => {
  try {
    const MAX_TREE_MEMORIES = 200;
    const memories = await listMemoriesByUser(req.user!.id, MAX_TREE_MEMORIES);
    const tree = buildMemoryTree(memories);
    res.json({ success: true, data: tree });
  } catch (err) {
    next(err);
  }
});

memoryRouter.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updates = updateSchema.parse(req.body);

    const memory = await findMemoryById(id, req.user!.id);
    if (!memory) {
      throw new AppError(404, 'Memory not found', 'MEMORY_NOT_FOUND');
    }

    await updateMemory(id, updates);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

memoryRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const memory = await findMemoryById(id, req.user!.id);
    if (!memory) {
      throw new AppError(404, 'Memory not found', 'MEMORY_NOT_FOUND');
    }

    await deleteMemory(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
