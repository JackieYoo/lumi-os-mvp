import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Plus, LayoutDashboard, Sparkles, Brain, Wrench } from 'lucide-react';
import { MessageList } from '../components/chat/MessageList.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import { AppLayout } from '../components/layout/AppLayout.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent } from '../components/ui/Card.js';
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
            const newCanvasNodes = eventToCanvasNodes(messageText, e as StreamEvent);
            if (newCanvasNodes.length > 0) {
              setCanvasNodes((prev) => [...prev, ...newCanvasNodes]);
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
      toast.error(error instanceof Error ? error.message : '发送失败');
      setIsStreaming(false);
    }
  };

  const settings = getSettings();

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
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleNewSession}>
            <Plus size={16} />
            新会话
          </Button>
          <Button variant={showCanvas ? 'primary' : 'ghost'} size="icon" onClick={() => setShowCanvas(!showCanvas)} aria-label="Toggle canvas">
            <LayoutDashboard size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <Settings size={18} />
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:flex">
            退出
          </Button>
        </div>
      }
    >
      <div className={cn('flex h-full flex-col gap-4 overflow-hidden p-4 lg:p-6', showCanvas && 'lg:flex-row')}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4', showCanvas && 'lg:max-w-[calc(100%-24rem)]')}>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-lumi-accent">
                  <Sparkles size={18} />
                  <span className="text-sm font-medium">Lumi Chat</span>
                </div>
                <h2 className="text-xl font-semibold text-text-primary">保持对话，让 Lumi 逐渐理解你</h2>
                <p className="mt-1 text-sm text-text-tertiary">当前模型：{settings.provider}{settings.model ? ` / ${settings.model}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill icon={<Brain size={14} />} label="记忆" active={settings.enableMemory} />
                <StatusPill icon={<Wrench size={14} />} label="工具" active={settings.enableTools} />
                <StatusPill icon={<LayoutDashboard size={14} />} label="Canvas" active={showCanvas} />
              </div>
            </CardContent>
          </Card>

          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-celestial-border bg-celestial-panel/40">
            <div className="flex h-full flex-col">
              <MessageList messages={messages} isStreaming={isStreaming} />
              <ChatInput onSend={handleSend} disabled={isStreaming} />
            </div>
          </div>
        </div>

        {showCanvas && (
          <div className="flex h-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-celestial-border bg-celestial-panel/40 lg:h-auto lg:w-96">
            <div className="border-b border-celestial-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <LayoutDashboard size={16} className="text-lumi-accent" />
                实时思考流
              </div>
              <p className="mt-1 text-xs text-text-tertiary">查看记忆检索、工具调用与回复生成过程</p>
            </div>
            <div className="min-h-0 flex-1">
              <ConversationCanvas nodes={canvasNodes} isStreaming={isStreaming} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatusPill({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <div className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium', active ? 'bg-lumi-accent/10 text-lumi-accent-soft ring-1 ring-lumi-accent/20' : 'bg-celestial-surface text-text-tertiary')}>
      {icon}
      {label}
    </div>
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
