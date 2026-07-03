import { getDb } from '../db/connection.js';
import { logger } from '../lib/logger.js';

export interface ConsolidationResult {
  merged: number;
  decayed: number;
}

export async function consolidateMemories(userId: string): Promise<ConsolidationResult> {
  const db = await getDb();
  const memories = await db.all<Array<{ id: string; content: string; importance: number; created_at: string }>>(
    'SELECT id, content, importance, created_at FROM memories WHERE user_id = ? ORDER BY created_at DESC',
    userId,
  );

  let merged = 0;
  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (let i = 0; i < memories.length; i++) {
    const current = memories[i];
    if (seen.has(current.id)) continue;

    for (let j = i + 1; j < memories.length; j++) {
      const other = memories[j];
      if (seen.has(other.id)) continue;

      if (isDuplicate(current.content, other.content)) {
        toDelete.push(other.id);
        seen.add(other.id);
        merged++;
      }
    }
  }

  if (toDelete.length > 0) {
    const placeholders = toDelete.map(() => '?').join(',');
    await db.run(
      `DELETE FROM memories WHERE id IN (${placeholders}) AND user_id = ?`,
      ...toDelete,
      userId,
    );
    await db.run(
      `DELETE FROM memory_embeddings WHERE memory_id IN (${placeholders})`,
      ...toDelete,
    );
  }

  // Decay old low-importance memories
  const decayed = await db.run(
    `UPDATE memories SET importance = MAX(1, importance - 1)
     WHERE user_id = ? AND importance > 1 AND created_at < datetime('now', '-30 days')`,
    userId,
  );

  logger.info('Memory consolidation complete', {
    userId,
    merged,
    decayed: decayed.changes || 0,
  });

  return { merged, decayed: decayed.changes || 0 };
}

function isDuplicate(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .sort()
      .join(' ');

  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;

  // Simple substring containment
  if (na.length > 30 && nb.includes(na.slice(0, 30))) return true;
  if (nb.length > 30 && na.includes(nb.slice(0, 30))) return true;

  return false;
}
