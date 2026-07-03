export interface User {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  importance: number;
  embedding_json: string | null;
  source: string | null;
  created_at: string;
  last_accessed_at: string;
}

export interface KnowledgeFile {
  id: string;
  user_id: string;
  filename: string;
  display_name: string;
  size: number;
  status: 'ready' | 'indexing' | 'indexed' | 'failed';
  content_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface MCPServerRecord {
  name: string;
  command: string | null;
  args: string | null;
  env: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}
