import { Router } from 'express';
import { listTools } from '../tools/registry.js';

export const toolRouter = Router();

toolRouter.get('/', (_req, res) => {
  const tools = listTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
  res.json({ success: true, data: tools });
});
