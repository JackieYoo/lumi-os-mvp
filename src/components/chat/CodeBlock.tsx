import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className={cn('group relative rounded-lg bg-[#0f172a] my-2', className)}>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-slate-700/50 text-slate-300 opacity-0 transition hover:bg-slate-600 hover:text-white group-hover:opacity-100"
        aria-label="复制代码"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre className="overflow-x-auto p-3 text-xs">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}
