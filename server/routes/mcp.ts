import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { MCPServerConfig } from '../mcp/types.js';
import {
  addServer,
  deleteServer,
  listServers,
  listAllTools,
} from '../mcp/manager.js';
import { listMCPTools } from '../mcp/tools.js';

const serverConfigSchema: z.ZodType<MCPServerConfig> = z.object({
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

mcpRouter.delete('/servers/:name', async (req: AuthRequest, res, next) => {
  try {
    await deleteServer(req.params.name);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

mcpRouter.get('/tools', async (_req: AuthRequest, res, next) => {
  try {
    const tools = await listAllTools();
    res.json({ success: true, data: tools });
  } catch (err) {
    next(err);
  }
});

mcpRouter.get('/tools/flat', async (_req: AuthRequest, res, next) => {
  try {
    const tools = listMCPTools();
    res.json({ success: true, data: tools });
  } catch (err) {
    next(err);
  }
});
