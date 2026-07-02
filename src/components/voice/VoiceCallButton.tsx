import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/Button.js';

export type VoiceButtonState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

interface VoiceCallButtonProps {
  state: VoiceButtonState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const stateConfig: Record<VoiceButtonState, { label: string; color: string; ring: string; icon: typeof Mic }> = {
  idle: { label: '按住说话', color: 'bg-lumi-accent text-celestial-deep', ring: 'ring-lumi-accent/30', icon: Mic },
  recording: { label: '松开结束', color: 'bg-red-500 text-white', ring: 'ring-red-500/40', icon: Square },
  processing: { label: '思考中...', color: 'bg-violet-500 text-white', ring: 'ring-violet-500/40', icon: Loader2 },
  speaking: { label: '播放中', color: 'bg-white text-celestial-deep', ring: 'ring-white/40', icon: Mic },
  error: { label: '重试', color: 'bg-red-500 text-white', ring: 'ring-red-500/40', icon: AlertCircle },
};

export function VoiceCallButton({ state, onStart, onStop, disabled }: VoiceCallButtonProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  const handleMouseDown = () => {
    if (state === 'idle' || state === 'error') {
      onStart();
    }
  };

  const handleMouseUp = () => {
    if (state === 'recording') {
      onStop();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || state === 'processing' || state === 'speaking'}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        className={cn(
          'relative h-20 w-20 rounded-full transition-all duration-200',
          'hover:scale-105 active:scale-95',
          'ring-4 ring-offset-4 ring-offset-celestial-deep',
          config.color,
          config.ring,
          state === 'recording' && 'animate-pulse',
          state === 'processing' && 'animate-spin',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={config.label}
      >
        <Icon size={32} className={cn(state === 'processing' && 'animate-spin')} />
      </Button>
      <span className={cn('text-sm font-medium', state === 'recording' ? 'text-red-400' : 'text-slate-300')}>
        {config.label}
      </span>
    </div>
  );
}
