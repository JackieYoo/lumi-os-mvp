import { FileText, Trash2, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';

export interface KnowledgeFileItem {
  id: string;
  display_name: string;
  size: number;
  status: 'ready' | 'indexing' | 'indexed' | 'failed';
  content_preview: string | null;
  created_at: string;
}

interface FileListProps {
  files: KnowledgeFileItem[];
  onIngest: (id: string) => void;
  onDelete: (id: string) => void;
  isProcessing?: string | null;
}

const statusConfig = {
  ready: { label: '待吸收', icon: FileText, color: 'outline' as const },
  indexing: { label: '索引中', icon: Loader2, color: 'default' as const },
  indexed: { label: '已索引', icon: CheckCircle, color: 'default' as const },
  failed: { label: '失败', icon: AlertCircle, color: 'outline' as const },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ files, onIngest, onDelete, isProcessing }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-12">
        <FileText size={32} className="mb-3 text-slate-600" />
        <p className="text-sm text-slate-500">暂无知识库文件</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => {
        const config = statusConfig[file.status];
        const Icon = config.icon;
        const isBusy = isProcessing === file.id || file.status === 'indexing';

        return (
          <div
            key={file.id}
            className="group flex flex-col gap-3 rounded-xl border border-slate-700/50 bg-celestial-panel/40 p-4 transition-colors hover:border-slate-600"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lumi-accent/10 text-lumi-accent"
                >
                  <Icon size={20} className={cn(file.status === 'indexing' && 'animate-spin')} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{file.display_name}</p>
                  <p className="text-xs text-slate-500">
                    {formatSize(file.size)} · {new Date(file.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={config.color}>{config.label}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(file.id)}
                  disabled={isBusy}
                  className="h-8 w-8 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {file.content_preview && (
              <p className="line-clamp-2 text-xs text-slate-500">{file.content_preview}</p>
            )}

            <div className="flex justify-end">
              {(file.status === 'ready' || file.status === 'failed') && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onIngest(file.id)}
                  disabled={isBusy}
                  className="gap-1.5"
                >
                  <RefreshCw size={14} className={cn(isBusy && 'animate-spin')} />
                  {file.status === 'failed' ? '重试吸收' : '吸收到知识库'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
