import { useState } from 'react';
import {
  MessageSquare,
  Brain,
  Wrench,
  CheckCircle,
  Cpu,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import type { CanvasNodeType, CanvasNodeData } from '../../types/canvas.js';

interface CanvasNodeProps {
  node: CanvasNodeData;
  isLast?: boolean;
}

const nodeConfig: Record<
  CanvasNodeType,
  {
    label: string;
    icon: typeof MessageSquare;
    color: string;
    borderColor: string;
    bgColor: string;
    align: 'left' | 'right';
  }
> = {
  user_input: {
    label: '你的输入',
    icon: MessageSquare,
    color: 'text-lumi-accent',
    borderColor: 'border-lumi-accent/50',
    bgColor: 'bg-lumi-accent/10',
    align: 'right',
  },
  memory_retrieval: {
    label: '记忆检索',
    icon: Brain,
    color: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    bgColor: 'bg-amber-400/10',
    align: 'left',
  },
  tool_call: {
    label: '工具调用',
    icon: Wrench,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-400/50',
    bgColor: 'bg-cyan-400/10',
    align: 'left',
  },
  tool_result: {
    label: '工具结果',
    icon: CheckCircle,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-400/50',
    bgColor: 'bg-emerald-400/10',
    align: 'left',
  },
  llm_reasoning: {
    label: 'LLM 推理',
    icon: Cpu,
    color: 'text-violet-400',
    borderColor: 'border-violet-400/50',
    bgColor: 'bg-violet-400/10',
    align: 'left',
  },
  response: {
    label: 'Lumi 回复',
    icon: Sparkles,
    color: 'text-white',
    borderColor: 'border-white/30',
    bgColor: 'bg-white/10',
    align: 'left',
  },
};

export function CanvasNode({ node, isLast }: CanvasNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const config = nodeConfig[node.type];
  const Icon = config.icon;

  const hasDetail = node.detail && node.detail.length > 0;
  const detailPreview = hasDetail
    ? node.detail!.slice(0, 120) + (node.detail!.length > 120 ? '...' : '')
    : '';

  return (
    <div
      className={cn(
        'flex w-full',
        config.align === 'right' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'relative max-w-[85%] rounded-xl border p-4 shadow-sm transition-all lg:max-w-[70%]',
          config.borderColor,
          config.bgColor,
          isLast && 'ring-1 ring-white/10'
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <Icon size={16} className={config.color} />
          <span className={cn('text-xs font-medium uppercase tracking-wider', config.color)}>
            {config.label}
          </span>
          {node.type === 'llm_reasoning' && (
            <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-violet-400" />
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm text-slate-200">{node.title}</p>

        {hasDetail && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? '收起详情' : '查看详情'}
            </button>
            {expanded && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/30 p-2 text-xs text-slate-300">
                {node.detail}
              </pre>
            )}
            {!expanded && (
              <p className="mt-1 text-xs text-slate-500">{detailPreview}</p>
            )}
          </div>
        )}

        {node.meta && Object.keys(node.meta).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(node.meta).map(([key, value]) =>
              value !== undefined ? (
                <span
                  key={key}
                  className="rounded-full bg-black/20 px-2 py-0.5 text-xs text-slate-400"
                >
                  {key}: {value}
                </span>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
