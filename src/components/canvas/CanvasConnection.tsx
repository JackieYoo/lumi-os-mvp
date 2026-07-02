interface CanvasConnectionProps {
  active?: boolean;
  className?: string;
}

export function CanvasConnection({ active = false, className }: CanvasConnectionProps) {
  return (
    <div className={`flex h-8 w-full items-center justify-center ${className || ''}`}>
      <svg width="2" height="32" className="overflow-visible">
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="32"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth="2"
          strokeDasharray="4 4"
          className={active ? 'animate-flow-line' : ''}
        />
        {active && (
          <circle
            cx="1"
            cy="16"
            r="3"
            fill="rgb(56, 189, 248)"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
