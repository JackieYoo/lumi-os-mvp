import { cn } from '../../lib/utils.js';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ className, label, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-slate-300">{label}</label>}
      <select
        className={cn(
          'h-10 w-full rounded-lg border border-slate-600 bg-celestial-deep px-3 text-sm text-white focus:border-lumi-accent focus:outline-none focus:ring-1 focus:ring-lumi-accent',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
