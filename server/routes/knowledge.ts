import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import { knowledgeRateLimiter } from '../lib/rateLimit.js';
import {
  createKnowledgeFile,
  listKnowledgeFilesByUser,
  findKnowledgeFileById,
  updateKnowledgeFileStatus,
  deleteKnowledgeFile,
} from '../db/knowledge.js';
import { createMemory } from '../db/memories.js';
import { extractText, canExtract } from '../knowledge/extractor.js';
import { chunkText } from '../knowledge/chunker.js';

export const knowledgeRouter = express.Router();

knowledgeRouter.use(knowledgeRateLimiter);

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (canExtract(file.originalname)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          `Unsupported file type: ${path.extname(file.originalname)}`,
          'UNSUPPORTED_FILE_TYPE'
        )
      );
    }
  },
});

knowledgeRouter.use(requireAuth);

knowledgeRouter.get('/files', async (req: AuthRequest, res, next) => {
  try {
    const files = await listKnowledgeFilesByUser(req.user!.id);
    res.json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get('/files/:id', async (req: AuthRequest, res, next) => {
  try {
    const file = await findKnowledgeFileById(req.params.id, req.user!.id);
    if (!file) {
      throw new AppError(404, 'File not found', 'NOT_FOUND');
    }
    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.post(
  '/upload',
  upload.array('files', 5),
  async (req: AuthRequest, res, next) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw new AppError(400, 'No files provided', 'MISSING_FILES');
      }

      const results: { id: string; filename: string; status: string }[] = [];

      for (const file of files) {
        const id = crypto.randomUUID();
        const displayName = file.originalname;
        const now = new Date().toISOString();

        await createKnowledgeFile({
          id,
          user_id: req.user!.id,
          filename: file.filename,
          display_name: displayName,
          size: file.size,
          status: 'ready',
          content_preview: null,
          created_at: now,
          updated_at: now,
        });

        results.push({ id, filename: displayName, status: 'ready' });
      }

      res.status(201).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
);

knowledgeRouter.post('/files/:id/ingest', async (req: AuthRequest, res, next) => {
  try {
    const file = await findKnowledgeFileById(req.params.id, req.user!.id);
    if (!file) {
      throw new AppError(404, 'File not found', 'NOT_FOUND');
    }

    await updateKnowledgeFileStatus(file.id, req.user!.id, 'indexing');

    try {
      const filePath = path.resolve(path.join(UPLOAD_DIR, file.filename));
      const resolvedUploadDir = path.resolve(UPLOAD_DIR);
      if (!filePath.startsWith(resolvedUploadDir + path.sep)) {
        throw new AppError(400, 'Invalid file path', 'INVALID_PATH');
      }

      const buffer = await fs.promises.readFile(filePath);
      const extracted = await extractText(file.display_name, buffer);
      const chunks = chunkText(extracted.text);
      const now = new Date().toISOString();

      for (const chunk of chunks) {
        await createMemory({
          id: crypto.randomUUID(),
          user_id: req.user!.id,
          content: `[Source: ${file.display_name}, chunk ${chunk.index}/${chunk.total}]\n${chunk.text}`,
          importance: 4,
          embedding_json: null,
          source: file.display_name,
          created_at: now,
          last_accessed_at: now,
        });
      }

      await updateKnowledgeFileStatus(file.id, req.user!.id, 'indexed', extracted.preview);

      res.json({
        success: true,
        data: {
          id: file.id,
          chunks: chunks.length,
          preview: extracted.preview,
        },
      });
    } catch (error) {
      await updateKnowledgeFileStatus(file.id, req.user!.id, 'failed');
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.delete('/files/:id', async (req: AuthRequest, res, next) => {
  try {
    const file = await findKnowledgeFileById(req.params.id, req.user!.id);
    if (!file) {
      throw new AppError(404, 'File not found', 'NOT_FOUND');
    }

    const filePath = path.resolve(path.join(UPLOAD_DIR, file.filename));
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!filePath.startsWith(resolvedUploadDir + path.sep)) {
      throw new AppError(400, 'Invalid file path', 'INVALID_PATH');
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await deleteKnowledgeFile(file.id, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
