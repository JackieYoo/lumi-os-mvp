import { cn } from '../../lib/utils.js';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700/50 bg-celestial-panel/80 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  return <h3 className={cn('font-semibold leading-none tracking-tight text-white', className)} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}
