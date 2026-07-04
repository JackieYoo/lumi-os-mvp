import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import { createSession, findSessionById, listSessionsByUser, deleteSession } from '../db/sessions.js';
import { createMessage, listMessagesBySession, deleteMessagesBySession } from '../db/messages.js';
import { listProviders } from '../llm/router.js';
import { handleChatStream } from '../chat/engine.js';
import { getOrCreateUserSettings } from '../db/settings.js';

const chatRequestSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1).max(20000),
  provider: z.string().optional(),
  model: z.string().optional(),
  enableMemory: z.boolean().optional(),
  enableTools: z.boolean().optional(),
});

export const chatRouter = Router();

chatRouter.get('/providers', (_req, res) => {
  res.json({ success: true, data: listProviders() });
});

chatRouter.get('/sessions', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const sessions = await listSessionsByUser(req.user!.id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

chatRouter.post('/sessions', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await createSession({
      id,
      user_id: req.user!.id,
      title: 'New Chat',
      provider: null,
      model: null,
      created_at: now,
      updated_at: now,
    });
    const session = await findSessionById(id);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/sessions/:id/messages', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const session = await findSessionById(req.params.id);
    if (!session || session.user_id !== req.user!.id) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }
    const messages = await listMessagesBySession(req.params.id);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
});

chatRouter.delete('/sessions/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const session = await findSessionById(req.params.id);
    if (!session || session.user_id !== req.user!.id) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }
    await deleteMessagesBySession(req.params.id);
    await deleteSession(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

chatRouter.post('/stream', requireAuth, async (req: AuthRequest, res) => {
  let sessionId: string | undefined;

  try {
    const body = chatRequestSchema.parse(req.body);
    sessionId = body.sessionId;
    const userSettings = await getOrCreateUserSettings(req.user!.id);
    const resolvedProvider = body.provider ?? userSettings.provider;
    const resolvedModel = body.model ?? userSettings.model ?? undefined;
    const resolvedEnableMemory = body.enableMemory ?? userSettings.enableMemory;
    const resolvedEnableTools = body.enableTools ?? userSettings.enableTools;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      const now = new Date().toISOString();
      await createSession({
        id: sessionId,
        user_id: req.user!.id,
        title: 'New Chat',
        provider: resolvedProvider,
        model: resolvedModel || null,
        created_at: now,
        updated_at: now,
      });
    } else {
      const session = await findSessionById(sessionId);
      if (!session || session.user_id !== req.user!.id) {
        throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
      }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';

    await handleChatStream({
      sessionId,
      userId: req.user!.id,
      message: body.message,
      provider: resolvedProvider,
      model: resolvedModel,
      enableMemory: resolvedEnableMemory,
      enableTools: resolvedEnableTools,
      onEvent: (event) => {
        if (event.type === 'delta' && event.content) {
          fullContent += event.content;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
    });

    // Save assistant final message
    await createMessage({
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'assistant',
      content: fullContent || '(no response)',
      tool_calls: null,
      tool_call_id: null,
      created_at: new Date().toISOString(),
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    const errorMessage = extractErrorMessage(err);

    if (res.headersSent) {
      // SSE already started: emit error event and close stream gracefully
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: 'LLM_ERROR',
    });
  }
});

function extractErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Chat stream failed';
}
