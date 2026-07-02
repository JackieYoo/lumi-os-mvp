import { OpenAI, toFile } from 'openai';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export interface STTResult {
  text: string;
}

const MIME_TYPE_WHISPER = 'audio/webm';

export function isSTTAvailable(): boolean {
  return Boolean(config.OPENAI_API_KEY);
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<STTResult> {
  if (!config.OPENAI_API_KEY) {
    throw new AppError(503, 'STT service is not configured', 'STT_NOT_CONFIGURED');
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new AppError(400, 'Audio buffer is empty', 'EMPTY_AUDIO');
  }

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  const file = await toFile(audioBuffer, 'recording.webm', { type: MIME_TYPE_WHISPER });

  try {
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'zh',
    });

    if (!response || typeof response.text !== 'string') {
      logger.error('Unexpected STT response structure', { response: JSON.stringify(response) });
      throw new AppError(502, 'STT returned unexpected response', 'STT_UNEXPECTED_RESPONSE');
    }

    return { text: response.text.trim() };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'STT failed';
    throw new AppError(502, `Speech-to-text failed: ${message}`, 'STT_FAILED');
  }
}
