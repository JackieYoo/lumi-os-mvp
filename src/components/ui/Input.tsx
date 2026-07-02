import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-slate-600 bg-celestial-deep px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-lumi-accent focus:outline-none focus:ring-1 focus:ring-lumi-accent disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
