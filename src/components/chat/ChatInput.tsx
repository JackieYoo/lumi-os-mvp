import { Send } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-celestial-border bg-celestial-panel/50 p-4 backdrop-blur-md">
      <div className="flex items-end gap-2 rounded-2xl border border-celestial-border-strong bg-celestial-deep/70 p-2 shadow-inner transition focus-within:border-lumi-accent/40 focus-within:shadow-[0_0_20px_rgba(56,189,248,0.1)]">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，按 Enter 发送…"
          disabled={disabled}
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          style={{ minHeight: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-lumi-accent to-lumi-accent-deep text-celestial-deep shadow-[0_0_16px_rgba(14,165,233,0.35)] transition hover:shadow-[0_0_24px_rgba(14,165,233,0.5)] hover:brightness-110 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
      <p className="mt-2 text-center text-[10px] text-text-tertiary">
        AI 生成内容仅供参考
      </p>
    </div>
  );
}
