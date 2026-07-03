import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { listRelationships, extractRelationships } from '../memory/relationships.js';
import { consolidateMemories } from '../memory/consolidation.js';
import { generateMemoryAvatar } from '../memory/avatar.js';
import { listMessagesBySession } from '../db/messages.js';

export const memoryEnhancementRouter = Router();
memoryEnhancementRouter.use(requireAuth);

memoryEnhancementRouter.get('/relationships', async (req: AuthRequest, res, next) => {
  try {
    const relationships = await listRelationships(req.user!.id);
    res.json({ success: true, data: relationships });
  } catch (err) {
    next(err);
  }
});

memoryEnhancementRouter.post('/relationships/extract', async (req: AuthRequest, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      res.status(400).json({ success: false, error: 'sessionId required' });
      return;
    }

    const messages = await listMessagesBySession(sessionId);
    const transcript = messages
      .slice(-30)
      .map((m) => `${m.role}: ${m.content || ''}`)
      .join('\n');

    const relationships = await extractRelationships(req.user!.id, transcript);
    res.json({ success: true, data: relationships });
  } catch (err) {
    next(err);
  }
});

memoryEnhancementRouter.post('/consolidate', async (req: AuthRequest, res, next) => {
  try {
    const result = await consolidateMemories(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

memoryEnhancementRouter.get('/avatar', async (req: AuthRequest, res, next) => {
  try {
    const { provider } = req.query as { provider?: string };
    const avatar = await generateMemoryAvatar(req.user!.id, provider);
    res.json({ success: true, data: avatar });
  } catch (err) {
    next(err);
  }
});
