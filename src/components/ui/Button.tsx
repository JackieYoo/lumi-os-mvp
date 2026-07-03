import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lumi-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-celestial-deep disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          {
            'bg-gradient-to-b from-lumi-accent to-lumi-accent-deep text-celestial-deep shadow-[0_0_20px_rgba(14,165,233,0.35)] hover:shadow-[0_0_28px_rgba(14,165,233,0.5)] hover:brightness-110':
              variant === 'primary',
            'border border-celestial-border-strong bg-celestial-surface/60 text-text-primary hover:bg-celestial-surface hover:border-celestial-border':
              variant === 'secondary',
            'bg-transparent text-text-secondary hover:bg-white/[0.06] hover:text-text-primary':
              variant === 'ghost',
            'bg-status-error/15 text-status-error hover:bg-status-error/25 border border-status-error/20':
              variant === 'danger',
            'border border-celestial-border bg-celestial-panel/50 text-text-primary backdrop-blur-md hover:bg-celestial-panel/70 hover:border-celestial-border-strong':
              variant === 'glass',
          },
          {
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
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
