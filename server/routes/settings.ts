import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { ValidationError } from '../lib/errors.js';
import { getOrCreateUserSettings, saveUserSettings } from '../db/settings.js';

const updateSettingsSchema = z.object({
  provider: z.string().min(1).optional(),
  model: z.string().nullable().optional(),
  enableMemory: z.boolean().optional(),
  enableTools: z.boolean().optional(),
  defaultVoice: z.string().nullable().optional(),
  defaultPersonaMode: z.string().nullable().optional(),
  notifications: z.record(z.unknown()).optional(),
});

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const settings = await getOrCreateUserSettings(req.user!.id);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

settingsRouter.put('/', async (req: AuthRequest, res, next) => {
  try {
    const input = updateSettingsSchema.parse(req.body);
    const settings = await saveUserSettings(req.user!.id, input);
    res.json({ success: true, data: settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new ValidationError(err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')));
      return;
    }
    next(err);
  }
});
