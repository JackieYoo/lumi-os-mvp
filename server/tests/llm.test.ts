import { describe, it, expect, vi } from 'vitest';
import { getProvider, listProviders } from '../llm/router.js';
import type { LLMProviderName } from '../llm/types.js';

const expectedProviders: { name: LLMProviderName; defaultModel: string }[] = [
  { name: 'openai', defaultModel: 'gpt-4o-mini' },
  { name: 'deepseek', defaultModel: 'deepseek-chat' },
  { name: 'anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
  { name: 'google', defaultModel: 'gemini-2.0-flash' },
  { name: 'qwen', defaultModel: 'qwen-max' },
  { name: 'doubao', defaultModel: 'doubao-1.5-pro-32k' },
  { name: 'kimi', defaultModel: 'moonshot-v1-8k' },
  { name: 'glm', defaultModel: 'glm-4-flash' },
  { name: 'xiaomi', defaultModel: 'milm' },
  { name: 'ollama', defaultModel: 'llama3.1' },
  { name: 'lmstudio', defaultModel: 'local-model' },
  { name: 'relay', defaultModel: 'gpt-4o-mini' },
];

describe('LLM Provider Registry', () => {
  it('lists all 11 expected providers', () => {
    const providers = listProviders();
    const names = providers.map((p) => p.name).sort();
    const expectedNames = expectedProviders.map((p) => p.name).sort();

    expect(names).toEqual(expectedNames);
  });

  expectedProviders.forEach(({ name, defaultModel }) => {
    it(`registers provider ${name}`, () => {
      const provider = getProvider(name);

      expect(provider.name).toBe(name);
      expect(provider.defaultModel).toBeTruthy();
      expect(typeof provider.isAvailable).toBe('function');
      expect(typeof provider.stream).toBe('function');
      expect(typeof provider.complete).toBe('function');
    });
  });

  it('uses expected default models for non-configurable providers', () => {
    const configurableProviders = ['relay'];
    const providersToCheck = expectedProviders.filter(
      (p) => !configurableProviders.includes(p.name),
    );

    providersToCheck.forEach(({ name, defaultModel }) => {
      expect(getProvider(name).defaultModel).toBe(defaultModel);
    });
  });

  it('throws for unsupported provider', () => {
    expect(() => getProvider('unknown-provider')).toThrow('Unsupported LLM provider');
  });
});
