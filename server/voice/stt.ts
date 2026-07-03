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

function extractTextFromResponse(response: unknown): string | undefined {
  if (typeof response === 'string') {
    return response.trim();
  }

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    if (typeof obj.text === 'string') {
      return obj.text.trim();
    }
    // Sometimes the SDK wraps the response in a `data` property
    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>;
      if (typeof data.text === 'string') {
        return data.text.trim();
      }
    }
  }

  return undefined;
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string = MIME_TYPE_WHISPER): Promise<STTResult> {
  if (!config.OPENAI_API_KEY) {
    throw new AppError(503, 'STT service is not configured', 'STT_NOT_CONFIGURED');
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new AppError(400, 'Audio buffer is empty', 'EMPTY_AUDIO');
  }

  logger.info('STT audio received', { size: audioBuffer.length, mimeType });

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  const file = await toFile(audioBuffer, 'recording.webm', { type: mimeType });

  try {
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'zh',
      response_format: 'json',
    });

    logger.info('STT raw response', {
      responseType: typeof response,
      responseConstructor: response ? (response as object).constructor.name : 'null',
      responseKeys: response && typeof response === 'object' ? Object.keys(response) : [],
    });

    const text = extractTextFromResponse(response);

    logger.info('STT extracted text', {
      textLength: text?.length ?? 0,
      isEmpty: text?.length === 0,
    });

    if (text === undefined) {
      logger.error('Unexpected STT response structure', {
        response: typeof response === 'string' ? response : JSON.stringify(response),
      });
      throw new AppError(502, 'STT returned unexpected response', 'STT_UNEXPECTED_RESPONSE');
    }

    if (text.length > 10000 || text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
      logger.error('STT returned suspiciously long or non-text response', {
        length: text.length,
        preview: text.slice(0, 200),
      });
      throw new AppError(502, 'STT returned garbled audio, please try again', 'STT_GARBLED');
    }

    return { text };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'STT failed';
    logger.error('OpenAI STT request failed', { error: message });
    throw new AppError(502, `Speech-to-text failed: ${message}`, 'STT_FAILED');
  }
}
