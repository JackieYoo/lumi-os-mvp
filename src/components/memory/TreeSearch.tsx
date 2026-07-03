import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input.js';
import { Button } from '../ui/Button.js';

interface TreeSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TreeSearch({ value, onChange, placeholder = '搜索记忆...' }: TreeSearchProps) {
  return (
    <div className="relative w-full max-w-md">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-10 pr-10" />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
        >
          <X size={14} />
        </Button>
      )}
    </div>
  );
}
