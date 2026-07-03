import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Badge } from '../ui/Badge.js';

interface TreeNodeDetailProps {
  content: string;
  importance: number;
  created_at: string;
  source?: string | null;
  onClose: () => void;
  className?: string;
}

export function TreeNodeDetail({
  content,
  importance,
  created_at,
  source,
  onClose,
  className,
}: TreeNodeDetailProps) {
  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 right-4 z-20 max-w-md rounded-2xl border border-celestial-border bg-celestial-panel/95 p-5 shadow-2xl backdrop-blur-xl lg:bottom-auto lg:left-auto lg:right-6 lg:top-20',
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="default">重要性 {importance}</Badge>
          {source && <Badge variant="outline">{source}</Badge>}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-tertiary hover:bg-white/5 hover:text-text-primary">
          <X size={18} />
        </button>
      </div>

      <p className="max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{content}</p>

      <p className="mt-3 text-xs text-text-tertiary">{new Date(created_at).toLocaleString('zh-CN')}</p>
    </div>
  );
}
