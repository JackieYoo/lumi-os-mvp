import { cn } from '../../lib/utils.js';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        {
          'bg-lumi-accent/20 text-lumi-accent': variant === 'default',
          'border border-slate-600 text-slate-300': variant === 'outline',
          'bg-celestial-surface text-slate-300': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
}
