export interface Chunk {
  index: number;
  total: number;
  text: string;
}

export function chunkText(
  text: string,
  options: { maxChunkSize?: number; overlapSize?: number } = {}
): Chunk[] {
  const { maxChunkSize = 500, overlapSize = 50 } = options;

  if (overlapSize >= maxChunkSize) {
    throw new Error('overlapSize must be less than maxChunkSize');
  }

  if (text.length <= maxChunkSize) {
    return [{ index: 1, total: 1, text }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 1;

  while (start < text.length) {
    let end = start + maxChunkSize;

    if (end < text.length) {
      // Try to break at newline or sentence boundary
      const nearestNewline = text.lastIndexOf('\n', end);
      const nearestSentence = Math.max(text.lastIndexOf('. ', end), text.lastIndexOf('。', end));
      const breakPoint = Math.max(nearestNewline, nearestSentence);

      if (breakPoint > start) {
        end = breakPoint + 1;
      }
    } else {
      end = text.length;
    }

    chunks.push({
      index,
      total: 0, // filled later
      text: text.slice(start, end).trim(),
    });

    start = end - overlapSize;
    index++;
  }

  const total = chunks.length;
  return chunks.map((c) => ({ ...c, total }));
}
