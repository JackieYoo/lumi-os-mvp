import { cn } from '../../lib/utils.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock.js';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'rounded-br-none bg-gradient-to-br from-lumi-accent to-lumi-accent-deep text-celestial-deep shadow-[0_4px_20px_rgba(14,165,233,0.25)]'
            : isTool
              ? 'rounded-bl-none border border-lumi-accent/30 bg-lumi-accent/10 text-lumi-accent-soft'
              : 'rounded-bl-none border border-celestial-border bg-celestial-surface/70 text-text-primary backdrop-blur-sm'
        )}
      >
        {isTool && message.toolName && (
          <div className="mb-1 text-xs font-medium opacity-80">工具: {message.toolName}</div>
        )}

        {isAssistant ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => {
                  const codeText = extractCodeText(children);
                  return <CodeBlock>{codeText}</CodeBlock>;
                },
                code: ({ children, className }) => {
                  const isInline = !className?.includes('language-');
                  if (isInline) {
                    return (
                      <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs text-lumi-accent">
                        {children}
                      </code>
                    );
                  }
                  return <code className={className}>{children}</code>;
                },
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lumi-accent underline hover:text-sky-300"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                p: ({ children }) => <p className="my-1.5">{children}</p>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </div>
  );
}

function extractCodeText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractCodeText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractCodeText((node as { props?: { children?: React.ReactNode } }).props?.children);
  }
  return '';
}
