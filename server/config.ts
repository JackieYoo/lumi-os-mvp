import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { logger } from './lib/logger.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const configSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  DATABASE_PATH: z.string().default('./data/lumi-mvp.db'),
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DASHSCOPE_API_KEY: z.string().optional(),
  DASHSCOPE_BASE_URL: z.string().default('https://dashscope.aliyuncs.com/compatible-mode/v1'),
  ARK_API_KEY: z.string().optional(),
  ARK_BASE_URL: z.string().default('https://ark.cn-beijing.volces.com/api/v3'),
  KIMI_API_KEY: z.string().optional(),
  KIMI_BASE_URL: z.string().default('https://api.moonshot.cn/v1'),
  GLM_API_KEY: z.string().optional(),
  GLM_BASE_URL: z.string().default('https://open.bigmodel.cn/api/paas/v4'),
  XIAOMI_API_KEY: z.string().optional(),
  XIAOMI_BASE_URL: z.string().default('https://api.mi.com/open-ai/v1'),
  LM_STUDIO_BASE_URL: z.string().default('http://localhost:1234/v1'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  CUSTOM_RELAY_BASE_URL: z.string().optional(),
  CUSTOM_RELAY_API_KEY: z.string().optional(),
  CUSTOM_RELAY_MODEL: z.string().optional(),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Invalid environment variables:', {
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
  process.exit(1);
}

export const config = parsed.data;

export type Config = typeof config;
