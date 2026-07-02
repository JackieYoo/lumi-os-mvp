import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-lumi-accent/50 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-lumi-accent text-celestial-deep hover:bg-sky-300': variant === 'primary',
            'bg-celestial-surface text-white hover:bg-slate-600': variant === 'secondary',
            'bg-transparent text-slate-300 hover:bg-white/5': variant === 'ghost',
            'bg-red-500/20 text-red-400 hover:bg-red-500/30': variant === 'danger',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4': size === 'md',
            'h-12 px-6': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
