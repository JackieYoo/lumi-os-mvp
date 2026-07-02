import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { FileUploader } from '../components/knowledge/FileUploader.js';
import { FileList, type KnowledgeFileItem } from '../components/knowledge/FileList.js';
import { Input } from '../components/ui/Input.js';
import { apiRequest, getToken } from '../lib/api.js';
import { toast } from 'sonner';

export default function KnowledgeBase() {
  const [files, setFiles] = useState<KnowledgeFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFiles = useCallback(async () => {
    try {
      const data = await apiRequest<KnowledgeFileItem[]>('GET', '/knowledge/files');
      setFiles(data);
    } catch {
      // Error already toasted by apiRequest
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = useCallback(
    async (uploadedFiles: FileList) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        Array.from(uploadedFiles).forEach((file) => formData.append('files', file));

        const response = await fetch('/api/knowledge/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        });

        const data = (await response.json()) as {
          success: boolean;
          data?: { id: string; filename: string; status: string }[];
          error?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.error || `Upload failed: ${response.status}`);
        }

        toast.success(`成功上传 ${uploadedFiles.length} 个文件`);
        await fetchFiles();
      } catch (error) {
        const message = error instanceof Error ? error.message : '上传失败';
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [fetchFiles]
  );

  const handleIngest = useCallback(
    async (id: string) => {
      setProcessingId(id);
      try {
        const result = await apiRequest<{ id: string; chunks: number }>(
          'POST',
          `/knowledge/files/${id}/ingest`
        );
        toast.success(`已吸收 ${result.chunks} 个片段`);
        await fetchFiles();
      } catch (error) {
        const message = error instanceof Error ? error.message : '吸收失败';
        toast.error(message);
      } finally {
        setProcessingId(null);
      }
    },
    [fetchFiles]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiRequest('DELETE', `/knowledge/files/${id}`);
        toast.success('文件已删除');
        await fetchFiles();
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除失败';
        toast.error(message);
      }
    },
    [fetchFiles]
  );

  const filteredFiles = files.filter((f) =>
    f.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="知识库" sidebarProps={{}} actions={null}>
      <div className="flex h-full flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <FileUploader onUpload={handleUpload} isUploading={isUploading} />
          </div>
          <div className="flex flex-col gap-4 lg:w-96">
            <div className="rounded-xl border border-slate-700/50 bg-celestial-panel/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-lumi-accent">
                <BookOpen size={18} />
                <h2 className="font-medium text-slate-200">知识库说明</h2>
              </div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>上传 TXT、Markdown、PDF 或代码文件</li>
                <li>点击“吸收到知识库”进行分块索引</li>
                <li>对话时会自动检索相关知识并引用来源</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Search size={18} className="text-slate-500" />
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <span className="text-sm text-slate-500">共 {filteredFiles.length} 个文件</span>
        </div>

        <FileList
          files={filteredFiles}
          onIngest={handleIngest}
          onDelete={handleDelete}
          isProcessing={processingId}
        />
      </div>
    </AppLayout>
  );
}
