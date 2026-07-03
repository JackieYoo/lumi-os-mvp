import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-xl border border-celestial-border bg-celestial-deep/60 px-4 py-2 text-sm text-text-primary shadow-inner transition placeholder:text-text-tertiary hover:border-celestial-border-strong focus:border-lumi-accent/50 focus:outline-none focus:ring-1 focus:ring-lumi-accent/30 disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
