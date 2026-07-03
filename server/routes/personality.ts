import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  getOrCreatePersonalityProfile,
  incubateFromChatLogs,
} from '../personality/engine.js';

export const personalityRouter = Router();
personalityRouter.use(requireAuth);

personalityRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const profile = await getOrCreatePersonalityProfile(req.user!.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

personalityRouter.post('/incubate', async (req: AuthRequest, res, next) => {
  try {
    const { provider, model, sample } = req.body as {
      provider?: string;
      model?: string;
      sample?: string;
    };
    const profile = await incubateFromChatLogs(
      req.user!.id,
      provider || 'openai',
      model,
      sample || '',
    );
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});
