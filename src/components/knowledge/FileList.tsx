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
  ready: { label: '待吸收', icon: FileText, variant: 'outline' as const },
  indexing: { label: '索引中', icon: Loader2, variant: 'warning' as const },
  indexed: { label: '已索引', icon: CheckCircle, variant: 'success' as const },
  failed: { label: '失败', icon: AlertCircle, variant: 'error' as const },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ files, onIngest, onDelete, isProcessing }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-celestial-border-strong bg-celestial-deep/20 py-14">
        <FileText size={36} className="mb-3 text-text-tertiary" />
        <p className="text-sm text-text-tertiary">暂无知识库文件</p>
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
          <Card
            key={file.id}
            className="group transition-colors hover:border-celestial-border-strong"
          >
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lumi-accent/10 text-lumi-accent"
                  >
                    <Icon size={20} className={cn(file.status === 'indexing' && 'animate-spin')} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{file.display_name}</p>
                    <p className="text-xs text-text-tertiary">
                      {formatSize(file.size)} · {new Date(file.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(file.id)}
                    disabled={isBusy}
                    className="h-8 w-8 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:text-status-error"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {file.content_preview && (
                <p className="line-clamp-2 text-xs text-text-tertiary">{file.content_preview}</p>
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
          </Card>
        );
      })}
    </div>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-celestial-border bg-celestial-panel/60 shadow-glass backdrop-blur-md', className)}>
      {children}
    </div>
  );
}
