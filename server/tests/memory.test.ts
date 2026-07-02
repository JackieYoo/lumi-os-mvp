import { describe, it, expect, beforeEach } from 'vitest';
import { buildMemoryContext } from '../memory/context.js';
import { storeMemory, getRecentMemories } from '../memory/store.js';
import { createUser, deleteUser } from '../db/users.js';
import { deleteMemoriesByUser } from '../db/memories.js';
import bcrypt from 'bcryptjs';

describe('Memory System', () => {
  let userId: string;

  beforeEach(async () => {
    userId = crypto.randomUUID();
    await createUser({
      id: userId,
      username: `memory-test-${Date.now()}`,
      password_hash: await bcrypt.hash('password123', 12),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it('stores and retrieves memories', async () => {
    await storeMemory(userId, { content: '用户喜欢喝咖啡', importance: 8 });
    await storeMemory(userId, { content: '用户有一只猫', importance: 6 });

    const recent = await getRecentMemories(userId, 10);
    expect(recent.length).toBe(2);
    expect(recent.map((m) => m.content)).toContain('用户喜欢喝咖啡');
  });

  it('builds memory context from stored memories', async () => {
    await storeMemory(userId, { content: '用户喜欢喝咖啡', importance: 8 });
    await storeMemory(userId, { content: '用户有一只猫', importance: 6 });

    const context = await buildMemoryContext(userId, '咖啡');
    expect(context.memories.length).toBeGreaterThan(0);
    expect(context.summary).toContain('用户喜欢喝咖啡');
  });

  it('cleans up user memories', async () => {
    await storeMemory(userId, { content: 'test', importance: 5 });
    await deleteMemoriesByUser(userId);
    const recent = await getRecentMemories(userId, 10);
    expect(recent.length).toBe(0);
  });
});
