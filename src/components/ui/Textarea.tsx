import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full resize-none rounded-xl border border-celestial-border bg-celestial-deep/60 px-4 py-3 text-sm text-text-primary shadow-inner transition placeholder:text-text-tertiary hover:border-celestial-border-strong focus:border-lumi-accent/50 focus:outline-none focus:ring-1 focus:ring-lumi-accent/30 disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
