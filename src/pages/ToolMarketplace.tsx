import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Trash2,
  Server,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { apiRequest } from '../lib/api.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { toast } from 'sonner';

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface MCPServer {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  connected?: boolean;
  toolCount?: number;
}

interface MCPToolGroup {
  server: string;
  tools: Tool[];
}

interface MCPServerForm {
  name: string;
  command: string;
  args: string;
  url: string;
}

const BUILT_IN_TOOLS = ['get_current_time', 'read_file', 'list_files', 'web_search'];

export default function ToolMarketplace() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPToolGroup[]>([]);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(() => {
    const raw = localStorage.getItem('lumi_enabled_tools');
    if (raw) {
      try {
        return new Set(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
    return new Set(BUILT_IN_TOOLS);
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServer, setNewServer] = useState<MCPServerForm>({
    name: '',
    command: '',
    args: '',
    url: '',
  });
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTools();
    loadMCPServers();
  }, []);

  useEffect(() => {
    localStorage.setItem('lumi_enabled_tools', JSON.stringify(Array.from(enabledTools)));
  }, [enabledTools]);

  const loadTools = async () => {
    try {
      const data = await apiRequest<Tool[]>('GET', '/tools');
      setTools(data);
    } catch {
      // handled
    }
  };

  const loadMCPServers = async () => {
    try {
      const [names, toolGroups] = await Promise.all([
        apiRequest<string[]>('GET', '/mcp/servers'),
        apiRequest<MCPToolGroup[]>('GET', '/mcp/tools'),
      ]);
      setMcpTools(toolGroups);
      setMcpServers(
        names.map((name) => {
          const group = toolGroups.find((g) => g.server === name);
          return {
            name,
            connected: true,
            toolCount: group?.tools?.length,
          };
        }),
      );
    } catch {
      // handled
    }
  };

  const toggleTool = (name: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleAddServer = async () => {
    if (!newServer.name) {
      toast.error('请输入服务器名称');
      return;
    }
    try {
      const config: MCPServer = {
        name: newServer.name,
        command: newServer.command || undefined,
        args: newServer.args ? newServer.args.split(',').map((s) => s.trim()) : undefined,
        url: newServer.url || undefined,
      };
      await apiRequest('POST', '/mcp/servers', config);
      setMcpServers((prev) => [...prev, config]);
      setShowAddForm(false);
      setNewServer({ name: '', command: '', args: '', url: '' });
      toast.success('MCP 服务器已添加');
    } catch {
      // handled
    }
  };

  const handleDeleteServer = async (name: string) => {
    try {
      await apiRequest('DELETE', `/mcp/servers/${name}`);
      setMcpServers((prev) => prev.filter((s) => s.name !== name));
      toast.success('已删除');
    } catch {
      // handled
    }
  };

  const toggleExpanded = (name: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <AppLayout title="工具 / MCP 市场" sidebarProps={{ sessions: [] }}>
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-5 overflow-y-auto p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">内置工具</h2>
            <p className="mt-1 text-sm text-text-tertiary">开启或关闭 Lumi 在对话中可调用的能力</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/chat')}>
            去聊天
          </Button>
        </div>

        <div className="grid gap-3">
          {tools.map((tool) => {
            const enabled = enabledTools.has(tool.name);
            const expanded = expandedTools.has(tool.name);
            return (
              <Card key={tool.name}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lumi-accent/20 text-lumi-accent">
                        <Wrench size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{tool.name}</span>
                          {BUILT_IN_TOOLS.includes(tool.name) && <Badge variant="outline">内置</Badge>}
                        </div>
                        <p className="text-sm text-text-tertiary">{tool.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(tool.name)}
                        className="text-text-tertiary hover:text-text-primary"
                      >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button
                        onClick={() => toggleTool(tool.name)}
                        className={`flex h-8 w-14 items-center rounded-full px-1 transition ${
                          enabled ? 'bg-lumi-accent' : 'bg-celestial-surface'
                        }`}
                      >
                        <div
                          className={`h-6 w-6 rounded-full bg-white shadow-sm transition ${
                            enabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 rounded-xl border border-celestial-border bg-celestial-deep/40 p-3">
                      <pre className="overflow-x-auto text-xs text-text-secondary">
                        {JSON.stringify(tool.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">MCP 服务器</h2>
            <p className="mt-1 text-sm text-text-tertiary">连接外部能力，让 Lumi 调用更多工具</p>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={16} /> 添加
          </Button>
        </div>

        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={18} className="text-lumi-accent" /> 添加 MCP 服务器
              </CardTitle>
              <CardDescription>支持 stdio 命令或 SSE URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="服务器名称"
                value={newServer.name}
                onChange={(e) => setNewServer((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="命令（可选，如 npx）"
                value={newServer.command}
                onChange={(e) => setNewServer((prev) => ({ ...prev, command: e.target.value }))}
              />
              <Input
                placeholder="参数，用逗号分隔（可选）"
                value={newServer.args}
                onChange={(e) => setNewServer((prev) => ({ ...prev, args: e.target.value }))}
              />
              <Input
                placeholder="URL（可选，用于 SSE）"
                value={newServer.url}
                onChange={(e) => setNewServer((prev) => ({ ...prev, url: e.target.value }))}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  取消
                </Button>
                <Button size="sm" onClick={handleAddServer}>
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {mcpServers.map((server) => (
            <Card key={server.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-celestial-surface text-text-secondary">
                      <Server size={18} />
                    </div>
                    <div>
                      <span className="font-medium text-text-primary">{server.name}</span>
                      <p className="text-xs text-text-tertiary">
                        {server.toolCount !== undefined ? `${server.toolCount} 个工具` : server.url || 'stdio'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={server.connected ? 'success' : 'outline'}>
                      {server.connected ? '已连接' : '未连接'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteServer(server.name)}
                      className="h-8 w-8 text-status-error hover:text-status-error"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {mcpTools
                  .find((g) => g.server === server.name)
                  ?.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="mt-3 rounded-xl border border-celestial-border bg-celestial-deep/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-lumi-accent-soft">{tool.name}</span>
                        <button
                          onClick={() => toggleExpanded(tool.name)}
                          className="text-text-tertiary hover:text-text-primary"
                        >
                          {expandedTools.has(tool.name) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-text-tertiary">{tool.description}</p>
                      {expandedTools.has(tool.name) && (
                        <pre className="mt-2 overflow-x-auto text-xs text-text-secondary">
                          {JSON.stringify(tool.parameters, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
          {mcpServers.length === 0 && !showAddForm && (
            <div className="rounded-2xl border border-dashed border-celestial-border-strong bg-celestial-deep/20 py-10 text-center text-sm text-text-tertiary">
              暂无 MCP 服务器配置
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
