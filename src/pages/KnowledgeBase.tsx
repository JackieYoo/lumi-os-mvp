import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Search, Network, Sparkles } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { FileUploader } from '../components/knowledge/FileUploader.js';
import { FileList, type KnowledgeFileItem } from '../components/knowledge/FileList.js';
import { KnowledgeGraph } from '../components/knowledge/KnowledgeGraph.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.js';
import { apiRequest, getToken } from '../lib/api.js';
import { toast } from 'sonner';

interface KnowledgeEntity {
  id: string;
  name: string;
  entity_type: string | null;
  mentions: number;
}

export default function KnowledgeBase() {
  const [files, setFiles] = useState<KnowledgeFileItem[]>([]);
  const [entities, setEntities] = useState<KnowledgeEntity[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<Array<{ content: string; source?: string; score: number }>>([]);

  const fetchFiles = useCallback(async () => {
    try {
      const data = await apiRequest<KnowledgeFileItem[]>('GET', '/knowledge/files');
      setFiles(data);
    } catch {
      // Error already toasted by apiRequest
    }
  }, []);

  const fetchEntities = useCallback(async () => {
    try {
      const data = await apiRequest<KnowledgeEntity[]>('GET', '/knowledge/entities');
      setEntities(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchEntities();
  }, [fetchFiles, fetchEntities]);

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
        await fetchEntities();
      } catch (error) {
        const message = error instanceof Error ? error.message : '吸收失败';
        toast.error(message);
      } finally {
        setProcessingId(null);
      }
    },
    [fetchFiles, fetchEntities]
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

  const handleSemanticSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await apiRequest<Array<{ content: string; source?: string; score: number }>>(
        'GET',
        `/knowledge/search?q=${encodeURIComponent(searchQuery)}`
      );
      setSemanticResults(results);
    } catch {
      // handled
    }
  }, [searchQuery]);

  const filteredFiles = files.filter((f) =>
    f.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="知识库" sidebarProps={{}} actions={null}>
      <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex-1 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={18} className="text-lumi-accent" /> 上传文件
                </CardTitle>
                <CardDescription>支持 TXT、Markdown、PDF、代码文件等，单个最大 20MB</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader onUpload={handleUpload} isUploading={isUploading} />
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Search size={18} className="text-text-tertiary" />
              <Input
                placeholder="语义搜索知识库..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                className="max-w-md"
              />
              <Button variant="secondary" onClick={handleSemanticSearch}>
                搜索
              </Button>
              <span className="text-sm text-text-tertiary">共 {filteredFiles.length} 个文件</span>
            </div>

            {semanticResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-secondary">语义搜索结果</h3>
                {semanticResults.map((result, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-celestial-border bg-celestial-deep/50 p-4 text-sm"
                  >
                    <p className="text-text-secondary">{result.content}</p>
                    <p className="mt-2 text-xs text-text-tertiary">
                      来源: {result.source} · 相关度: {result.score.toFixed(3)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <FileList
              files={filteredFiles}
              onIngest={handleIngest}
              onDelete={handleDelete}
              isProcessing={processingId}
            />
          </div>

          <div className="flex flex-col gap-5 lg:w-96">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen size={18} className="text-lumi-accent" /> 知识库说明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lumi-accent" />
                    上传 TXT、Markdown、PDF 或代码文件
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lumi-accent" />
                    点击“吸收到知识库”进行分块索引
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lumi-accent" />
                    对话时会自动检索相关知识并引用来源
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network size={18} className="text-lumi-accent" /> 知识图谱
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <KnowledgeGraph entities={entities} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
