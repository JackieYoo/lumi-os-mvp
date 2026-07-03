import express from 'express';
import multer from 'multer';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { transcribeAudio, isSTTAvailable } from '../voice/stt.js';
import { synthesizeSpeech, isTTSAvailable } from '../voice/tts.js';
import { AppError } from '../lib/errors.js';
import { voiceRateLimiter } from '../lib/rateLimit.js';

export const voiceRouter = express.Router();

voiceRouter.use(voiceRateLimiter);
voiceRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Unsupported audio type: ${file.mimetype}`, 'UNSUPPORTED_AUDIO_TYPE'));
    }
  },
});

voiceRouter.use(requireAuth);

voiceRouter.get('/status', (_req: AuthRequest, res) => {
  res.json({
    success: true,
    data: {
      stt: isSTTAvailable(),
      tts: isTTSAvailable(),
    },
  });
});

voiceRouter.post(
  '/stt',
  upload.single('audio'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'No audio file provided', 'MISSING_AUDIO_FILE');
      }

      const result = await transcribeAudio(req.file.buffer, req.file.mimetype);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

voiceRouter.post('/tts', async (req: AuthRequest, res, next) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new AppError(400, 'Text is required', 'MISSING_TTS_TEXT');
    }

    const result = await synthesizeSpeech(text.trim());
    res.set('Content-Type', result.contentType);
    res.send(result.audioBuffer);
  } catch (error) {
    next(error);
  }
});
