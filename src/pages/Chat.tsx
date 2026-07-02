import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Plus, LayoutDashboard } from 'lucide-react';
import { MessageList } from '../components/chat/MessageList.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import { AppLayout } from '../components/layout/AppLayout.js';
import { ConversationCanvas } from '../components/canvas/ConversationCanvas.js';
import { apiRequest, streamChat } from '../lib/api.js';
import { createUserInputNode, eventToCanvasNodes } from '../lib/canvasEvents.js';
import type { StreamEvent } from '../lib/canvasEvents.js';
import { useAuth } from '../contexts/AuthContext.js';
import { cn } from '../lib/utils.js';
import { toast } from 'sonner';
import type { CanvasNodeData } from '../types/canvas.js';

interface ChatSession {
  id: string;
  title: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

interface StoredMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
}

export default function Chat() {
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(urlSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const assistantContentRef = useRef('');
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeData[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiRequest<ChatSession[]>('GET', '/chat/sessions');
      setSessions(data);
    } catch {
      // handled by apiRequest toast
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (urlSessionId) {
      setActiveSessionId(urlSessionId);
      loadMessages(urlSessionId);
    } else {
      setActiveSessionId(undefined);
      setMessages([]);
    }
  }, [urlSessionId]);

  const loadMessages = async (sessionId: string) => {
    try {
      const data = await apiRequest<StoredMessage[]>('GET', `/chat/sessions/${sessionId}/messages`);
      const normalized: ChatMessage[] = [];
      for (const m of data) {
        if (m.role === 'system') continue;
        if (m.role === 'tool') {
          normalized.push({
            id: m.id,
            role: 'tool',
            content: m.content || '',
            toolName: 'result',
          });
        } else {
          normalized.push({
            id: m.id,
            role: m.role,
            content: m.content || '',
          });
        }
      }
      setMessages(normalized);
    } catch {
      // handled
    }
  };

  const handleNewSession = async () => {
    try {
      const session = await apiRequest<ChatSession>('POST', '/chat/sessions');
      setSessions((prev) => [session, ...prev]);
      navigate(`/chat/${session.id}`);
    } catch {
      // handled
    }
  };

  const handleSelectSession = async (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await apiRequest('DELETE', `/chat/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        navigate('/chat');
      }
    } catch {
      // handled
    }
  };

  const handleSend = async (messageText: string) => {
    if (!activeSessionId) {
      try {
        const session = await apiRequest<ChatSession>('POST', '/chat/sessions');
        setSessions((prev) => [session, ...prev]);
        navigate(`/chat/${session.id}`);
        await sendMessage(session.id, messageText);
      } catch {
        // handled
      }
      return;
    }
    await sendMessage(activeSessionId, messageText);
  };

  const sendMessage = async (sessionId: string, messageText: string) => {
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    if (showCanvas) {
      setCanvasNodes((prev) => [...prev, createUserInputNode(messageText)]);
    }

    const settings = getSettings();
    assistantContentRef.current = '';

    try {
      await streamChat(
        {
          sessionId,
          message: messageText,
          provider: settings.provider,
          model: settings.model,
          enableMemory: settings.enableMemory,
          enableTools: settings.enableTools,
        },
        (event: unknown) => {
          const e = event as {
            type: string;
            content?: string;
            toolCall?: { id: string; name: string };
            toolResult?: unknown;
            error?: string;
          };
          if (e.type === 'delta' && e.content) {
            assistantContentRef.current += e.content;
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== 'assistant-streaming');
              return [
                ...filtered,
                {
                  id: 'assistant-streaming',
                  role: 'assistant',
                  content: assistantContentRef.current,
                },
              ];
            });
          } else if (e.type === 'tool_call' && e.toolCall) {
            const toolName = e.toolCall.name;
            setMessages((prev) => [
              ...prev,
              {
                id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                role: 'tool',
                content: `调用工具: ${toolName}`,
                toolName,
              },
            ]);
          } else if (e.type === 'error' && e.error) {
            toast.error(e.error);
            setIsStreaming(false);
          }

          if (showCanvas) {
            const canvasNodes = eventToCanvasNodes(messageText, e as StreamEvent);
            if (canvasNodes.length > 0) {
              setCanvasNodes((prev) => [...prev, ...canvasNodes]);
            }
          }
        },
        () => {
          setIsStreaming(false);
          loadMessages(sessionId).then(loadSessions);
        },
        (error) => {
          toast.error(error.message);
          setIsStreaming(false);
        }
      );
    } catch (error) {
      toast.error((error as Error).message);
      setIsStreaming(false);
    }
  };

  return (
    <AppLayout
      title="对话"
      sidebarProps={{
        sessions,
        activeSessionId,
        onNewSession: handleNewSession,
        onSelectSession: handleSelectSession,
        onDeleteSession: handleDeleteSession,
      }}
      actions={
        <>
          <button
            onClick={handleNewSession}
            className="flex h-8 items-center gap-1 rounded-lg bg-lumi-accent/20 px-3 text-sm font-medium text-lumi-accent hover:bg-lumi-accent/30"
          >
            <Plus size={16} />
            新会话
          </button>
          <button
            onClick={() => setShowCanvas(!showCanvas)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              showCanvas
                ? 'bg-lumi-accent/20 text-lumi-accent'
                : 'text-slate-300 hover:bg-white/5'
            )}
            aria-label="Toggle canvas"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={logout}
            className="hidden h-8 items-center gap-1 rounded-lg border border-slate-600 px-3 text-sm text-slate-300 hover:bg-white/5 sm:flex"
          >
            退出
          </button>
        </>
      }
    >
      <div className={cn('flex h-full', showCanvas && 'flex-col lg:flex-row')}>
        <div className={cn('flex h-full flex-col', showCanvas ? 'flex-1' : 'w-full')}>
          <MessageList messages={messages} isStreaming={isStreaming} />
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
        {showCanvas && (
          <div className="h-80 border-t border-slate-700/50 lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
            <ConversationCanvas nodes={canvasNodes} isStreaming={isStreaming} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function getSettings() {
  const raw = localStorage.getItem('lumi_settings');
  const defaults = {
    provider: 'openai',
    model: '',
    enableMemory: true,
    enableTools: true,
  };
  if (!raw) return defaults;
  try {
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}
