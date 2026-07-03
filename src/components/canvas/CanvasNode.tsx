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
    borderColor: 'border-lumi-accent/40',
    bgColor: 'bg-lumi-accent/10',
    align: 'right',
  },
  memory_retrieval: {
    label: '记忆检索',
    icon: Brain,
    color: 'text-amber-300',
    borderColor: 'border-amber-400/30',
    bgColor: 'bg-amber-400/10',
    align: 'left',
  },
  tool_call: {
    label: '工具调用',
    icon: Wrench,
    color: 'text-cyan-300',
    borderColor: 'border-cyan-400/30',
    bgColor: 'bg-cyan-400/10',
    align: 'left',
  },
  tool_result: {
    label: '工具结果',
    icon: CheckCircle,
    color: 'text-emerald-300',
    borderColor: 'border-emerald-400/30',
    bgColor: 'bg-emerald-400/10',
    align: 'left',
  },
  llm_reasoning: {
    label: 'LLM 推理',
    icon: Cpu,
    color: 'text-violet-300',
    borderColor: 'border-violet-400/30',
    bgColor: 'bg-violet-400/10',
    align: 'left',
  },
  response: {
    label: 'Lumi 回复',
    icon: Sparkles,
    color: 'text-text-primary',
    borderColor: 'border-celestial-border-strong',
    bgColor: 'bg-celestial-surface/60',
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
    <div className={cn('flex w-full', config.align === 'right' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[88%] rounded-2xl border p-4 shadow-glass transition-all duration-200 lg:max-w-[72%]',
          config.borderColor,
          config.bgColor,
          isLast && 'ring-1 ring-lumi-accent/10'
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-black/15', config.color)}>
            <Icon size={14} />
          </div>
          <span className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', config.color)}>
            {config.label}
          </span>
          {node.type === 'llm_reasoning' && (
            <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-violet-400" />
          )}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{node.title}</p>

        {hasDetail && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? '收起详情' : '查看详情'}
            </button>
            {expanded && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-celestial-border bg-celestial-deep/50 p-3 text-xs text-text-secondary">
                {node.detail}
              </pre>
            )}
            {!expanded && <p className="mt-1 text-xs text-text-tertiary">{detailPreview}</p>}
          </div>
        )}

        {node.meta && Object.keys(node.meta).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(node.meta).map(([key, value]) =>
              value !== undefined ? (
                <span
                  key={key}
                  className="rounded-full border border-celestial-border bg-black/10 px-2 py-0.5 text-[10px] text-text-tertiary"
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
