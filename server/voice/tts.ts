import { OpenAI } from 'openai';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

export interface TTSResult {
  audioBuffer: Buffer;
  contentType: string;
}

export function isTTSAvailable(): boolean {
  return Boolean(config.OPENAI_API_KEY);
}

export async function synthesizeSpeech(text: string): Promise<TTSResult> {
  if (!config.OPENAI_API_KEY) {
    throw new AppError(503, 'TTS service is not configured', 'TTS_NOT_CONFIGURED');
  }

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    });

    const arrayBuffer = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      contentType: 'audio/mpeg',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS failed';
    throw new AppError(502, `Text-to-speech failed: ${message}`, 'TTS_FAILED');
  }
}
