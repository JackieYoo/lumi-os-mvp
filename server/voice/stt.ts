import { OpenAI, toFile } from 'openai';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

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

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  const file = await toFile(audioBuffer, 'recording.webm', { type: MIME_TYPE_WHISPER });

  try {
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'zh',
    });

    return { text: response.text.trim() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'STT failed';
    throw new AppError(502, `Speech-to-text failed: ${message}`, 'STT_FAILED');
  }
}
