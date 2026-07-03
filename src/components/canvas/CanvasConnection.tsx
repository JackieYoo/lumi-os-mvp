interface CanvasConnectionProps {
  active?: boolean;
  className?: string;
}

export function CanvasConnection({ active = false, className }: CanvasConnectionProps) {
  return (
    <div className={`flex h-10 w-full items-center justify-center ${className || ''}`}>
      <svg width="6" height="40" className="overflow-visible">
        <line
          x1="3"
          y1="0"
          x2="3"
          y2="40"
          stroke="rgba(56, 189, 248, 0.18)"
          strokeWidth="2"
          strokeDasharray="4 4"
          className={active ? 'animate-flow-line' : ''}
        />
        {active && (
          <>
            <circle cx="3" cy="20" r="4" fill="rgba(56, 189, 248, 0.2)" className="animate-pulse" />
            <circle cx="3" cy="20" r="2" fill="rgb(56, 189, 248)" className="animate-pulse" />
          </>
        )}
      </svg>
    </div>
  );
}
