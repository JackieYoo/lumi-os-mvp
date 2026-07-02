import {
  LLMProvider,
  LLMProviderName,
  LLMOptions,
  LLMStreamChunk,
  LLMCompleteResponse,
} from './types.js';
import { openAIProvider, deepseekProvider, ollamaProvider, relayProvider } from './openai.js';
import { anthropicProvider } from './anthropic.js';
import { googleProvider } from './google.js';

const providers: Record<LLMProviderName, LLMProvider> = {
  openai: openAIProvider,
  deepseek: deepseekProvider,
  ollama: ollamaProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  relay: relayProvider,
};

export function getProvider(name: string): LLMProvider {
  const provider = providers[name as LLMProviderName];
  if (!provider) {
    throw new Error(`Unsupported LLM provider: ${name}`);
  }
  return provider;
}

export function listProviders(): { name: string; defaultModel: string; available: boolean }[] {
  return Object.values(providers).map((p) => ({
    name: p.name,
    defaultModel: p.defaultModel,
    available: p.isAvailable(),
  }));
}

export async function streamLLM(
  options: LLMOptions,
  onChunk: (chunk: LLMStreamChunk) => void
): Promise<void> {
  const provider = getProvider(options.provider);
  return provider.stream(options, onChunk);
}

export async function completeLLM(options: LLMOptions): Promise<LLMCompleteResponse> {
  const provider = getProvider(options.provider);
  return provider.complete(options);
}

export async function listModels(providerName: string): Promise<string[]> {
  const provider = getProvider(providerName);
  if (provider.listModels) {
    return provider.listModels();
  }
  return [];
}
