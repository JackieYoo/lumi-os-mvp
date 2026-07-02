import { useRef, useEffect } from 'react';
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
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-slate-400">
          <p className="text-lg font-medium">你好，我是 Lumi</p>
          <p className="text-sm">有什么可以帮你的吗？</p>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-none bg-celestial-surface px-4 py-2 text-sm text-slate-400">
            Lumi 正在思考…
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
