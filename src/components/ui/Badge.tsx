import { cn } from '../../lib/utils.js';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'success' | 'warning' | 'error';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        {
          'bg-lumi-accent/15 text-lumi-accent-soft ring-1 ring-lumi-accent/20': variant === 'default',
          'border border-celestial-border-strong text-text-secondary': variant === 'outline',
          'bg-celestial-surface text-text-secondary': variant === 'secondary',
          'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20': variant === 'success',
          'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20': variant === 'warning',
          'bg-red-500/15 text-red-300 ring-1 ring-red-500/20': variant === 'error',
        },
        className
      )}
      {...props}
    />
  );
}
