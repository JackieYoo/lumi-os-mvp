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
    <div className="border-t border-slate-700/50 bg-celestial-panel/50 p-4">
      <div className="flex items-end gap-2 rounded-xl border border-slate-600 bg-celestial-deep p-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息…"
          disabled={disabled}
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          style={{ minHeight: '40px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-lumi-accent text-celestial-deep transition hover:bg-sky-300 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
