export interface MemoryCandidate {
  content: string;
  importance: number;
}

export interface MemoryContext {
  memories: { content: string; importance: number }[];
  summary: string;
}
