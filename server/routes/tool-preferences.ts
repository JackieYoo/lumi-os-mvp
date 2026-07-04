import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { ValidationError } from '../lib/errors.js';
import {
  getUserToolPreferences,
  setUserToolPreference,
} from '../db/tool-preferences.js';

const updatePreferenceSchema = z.object({
  toolName: z.string().min(1),
  enabled: z.boolean(),
  source: z.enum(['builtin', 'mcp']).optional(),
});

export const toolPreferencesRouter = Router();
toolPreferencesRouter.use(requireAuth);

toolPreferencesRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const prefs = await getUserToolPreferences(req.user!.id);
    res.json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
});

toolPreferencesRouter.put('/', async (req: AuthRequest, res, next) => {
  try {
    const input = updatePreferenceSchema.parse(req.body);
    const pref = await setUserToolPreference(
      req.user!.id,
      input.toolName,
      input.enabled,
      input.source ?? 'builtin',
    );
    res.json({ success: true, data: pref });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new ValidationError(err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')));
      return;
    }
    next(err);
  }
});
