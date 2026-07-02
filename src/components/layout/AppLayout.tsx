import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Brain,
  Wrench,
  Mic,
  BookOpen,
  LayoutDashboard,
  Network,
  User,
  Menu,
  X,
  Plus,
  MessageSquare as MessageIcon,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface ChatSession {
  id: string;
  title: string;
}

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions?: ChatSession[];
  activeSessionId?: string;
  onNewSession?: () => void;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

const navItems = [
  { path: '/chat', label: '对话', icon: MessageSquare },
  { path: '/voice', label: '语音', icon: Mic },
  { path: '/canvas', label: '画布', icon: LayoutDashboard },
  { path: '/memories', label: '记忆', icon: Brain },
  { path: '/memories/tree', label: '记忆树', icon: Network },
  { path: '/knowledge', label: '知识库', icon: BookOpen },
  { path: '/tools', label: '工具', icon: Wrench },
  { path: '/profile', label: '个人中心', icon: User },
];

export function AppSidebar({
  isOpen,
  onClose,
  sessions = [],
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
}: AppSidebarProps) {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-slate-700/50 bg-celestial-panel transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-700/50 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lumi-accent/20 text-lumi-accent">
              <Brain size={18} />
            </div>
            <span className="font-semibold text-white">LumiOS</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            应用
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  onClose();
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  active
                    ? 'bg-lumi-accent/20 text-lumi-accent'
                    : 'text-slate-300 hover:bg-white/5'
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {isChatPage && onNewSession && onSelectSession && onDeleteSession && (
            <>
              <div className="mb-2 mt-6 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                会话
              </div>
              <button
                onClick={onNewSession}
                className="mb-2 flex w-full items-center gap-2 rounded-lg bg-lumi-accent/20 px-3 py-2 text-sm font-medium text-lumi-accent hover:bg-lumi-accent/30"
              >
                <Plus size={16} />
                新会话
              </button>
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className={cn(
                      'group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm',
                      activeSessionId === session.id
                        ? 'bg-lumi-accent/20 text-lumi-accent'
                        : 'text-slate-300 hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageIcon size={14} />
                      <span className="truncate">{session.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 text-slate-500 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-500">暂无会话</p>
                )}
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

export function AppHeader({
  onOpenSidebar,
  title,
  actions,
}: {
  onOpenSidebar: () => void;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-700/50 bg-celestial-panel/80 px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5"
        >
          <Menu size={18} />
        </button>
        <span className="font-semibold text-white">{title}</span>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

export function AppLayout({
  children,
  sidebarProps,
  title,
  actions,
}: {
  children: React.ReactNode;
  sidebarProps: Omit<AppSidebarProps, 'isOpen' | 'onClose'>;
  title: string;
  actions?: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        {...sidebarProps}
        sessions={sidebarProps.sessions || []}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col">
        <AppHeader
          onOpenSidebar={() => setIsSidebarOpen(true)}
          title={title}
          actions={actions}
        />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
