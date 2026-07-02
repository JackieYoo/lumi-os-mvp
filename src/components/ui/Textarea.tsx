import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full resize-none rounded-lg border border-slate-600 bg-celestial-deep px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-lumi-accent focus:outline-none focus:ring-1 focus:ring-lumi-accent disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
