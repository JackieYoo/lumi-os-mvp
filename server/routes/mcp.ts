import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  addServer,
  removeServer,
  listServers,
  listAllTools,
} from '../mcp/manager.js';

const serverConfigSchema = z.object({
  name: z.string().min(1),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
});

export const mcpRouter = Router();
mcpRouter.use(requireAuth);

mcpRouter.get('/servers', (_req: AuthRequest, res) => {
  res.json({ success: true, data: listServers() });
});

mcpRouter.post('/servers', async (req: AuthRequest, res, next) => {
  try {
    const config = serverConfigSchema.parse(req.body);
    await addServer(config);
    res.status(201).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

mcpRouter.delete('/servers/:name', (req: AuthRequest, res) => {
  removeServer(req.params.name);
  res.json({ success: true });
});

mcpRouter.get('/tools', async (_req: AuthRequest, res, next) => {
  try {
    const tools = await listAllTools();
    res.json({ success: true, data: tools });
  } catch (err) {
    next(err);
  }
});
