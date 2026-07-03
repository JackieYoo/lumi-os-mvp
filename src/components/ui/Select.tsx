import { cn } from '../../lib/utils.js';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ className, label, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      <select
        className={cn(
          'h-10 w-full rounded-xl border border-celestial-border bg-celestial-deep/60 px-4 pr-8 text-sm text-text-primary shadow-inner transition hover:border-celestial-border-strong focus:border-lumi-accent/50 focus:outline-none focus:ring-1 focus:ring-lumi-accent/30',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
