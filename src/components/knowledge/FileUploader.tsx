import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/Button.js';
import { toast } from 'sonner';

interface FileUploaderProps {
  onUpload: (files: FileList) => void;
  isUploading?: boolean;
  className?: string;
}

export function FileUploader({ onUpload, isUploading, className }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        if (e.dataTransfer.files.length > 5) {
          toast.error('最多一次上传 5 个文件');
          return;
        }
        setSelectedFiles(Array.from(e.dataTransfer.files));
        onUpload(e.dataTransfer.files);
      }
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        if (e.target.files.length > 5) {
          toast.error('最多一次上传 5 个文件');
          return;
        }
        setSelectedFiles(Array.from(e.target.files));
        onUpload(e.target.files);
      }
    },
    [onUpload]
  );

  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors',
          'bg-celestial-panel/40 hover:bg-celestial-panel/60',
          isDragging
            ? 'border-lumi-accent bg-lumi-accent/10'
            : 'border-slate-700 hover:border-lumi-accent/50',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <input
          type="file"
          multiple
          accept=".txt,.md,.pdf,.json,.csv,.ts,.js,.tsx,.jsx,.py,.html,.css"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lumi-accent/20 text-lumi-accent">
          <Upload size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-200">
            {isDragging ? '松开以上传' : '点击或拖拽文件到此处'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            支持 TXT、Markdown、PDF、代码文件等，单个最大 20MB
          </p>
        </div>
      </label>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg bg-celestial-panel/60 px-3 py-2"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={16} className="shrink-0 text-lumi-accent" />
                <span className="truncate text-sm text-slate-200">{file.name}</span>
                <span className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearSelection}
                  className="h-7 w-7 shrink-0 text-slate-500 hover:text-red-400"
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
