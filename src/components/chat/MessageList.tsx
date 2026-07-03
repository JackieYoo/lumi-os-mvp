import { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble.js';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-4 lg:p-6">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lumi-accent/30 to-lumi-accent/10 text-lumi-accent ring-1 ring-lumi-accent/30">
            <Sparkles size={28} className="relative z-10" />
            <span className="absolute inset-0 rounded-2xl bg-lumi-accent/10 blur-lg" />
          </div>
          <p className="text-xl font-semibold text-text-primary">你好，我是 Lumi</p>
          <p className="mt-1 text-sm text-text-secondary">有什么可以帮你的吗？</p>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-celestial-border bg-celestial-surface/60 px-4 py-2.5 text-sm text-text-secondary">
            <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-lumi-accent" />
            Lumi 正在思考…
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
