import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Brain,
  Wrench,
  Mic,
  BookOpen,
  LayoutDashboard,
  Network,
  User,
  Sparkles,
  Menu,
  X,
  Plus,
  Trash2,
  ListTodo,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { NotificationBell } from '../notifications/NotificationBell.js';

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

interface NavSection {
  title: string;
  items: Array<{ path: string; label: string; icon: typeof MessageSquare }>;
}

const navSections: NavSection[] = [
  {
    title: '核心',
    items: [
      { path: '/chat', label: '对话', icon: MessageSquare },
      { path: '/voice', label: '语音', icon: Mic },
      { path: '/canvas', label: '画布', icon: LayoutDashboard },
      { path: '/tasks', label: '任务', icon: ListTodo },
    ],
  },
  {
    title: '记忆与知识',
    items: [
      { path: '/memories', label: '记忆', icon: Brain },
      { path: '/memories/tree', label: '记忆树', icon: Network },
      { path: '/memories/avatar', label: '记忆化身', icon: Sparkles },
      { path: '/knowledge', label: '知识库', icon: BookOpen },
    ],
  },
  {
    title: '系统',
    items: [
      { path: '/tools', label: '工具', icon: Wrench },
      { path: '/personality', label: '人格', icon: Sparkles },
      { path: '/profile', label: '个人中心', icon: User },
    ],
  },
];

function NavItem({
  item,
  active,
  onClick,
}: {
  item: NavSection['items'][number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
        active
          ? 'bg-lumi-accent/10 text-lumi-accent'
          : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-lumi-accent shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
      )}
      <Icon
        size={18}
        className={cn(
          'transition-colors',
          active ? 'text-lumi-accent' : 'text-text-tertiary group-hover:text-text-secondary'
        )}
      />
      <span className="font-medium">{item.label}</span>
      {active && (
        <ChevronRight
          size={14}
          className="ml-auto opacity-60"
        />
      )}
    </Link>
  );
}

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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-celestial-border bg-celestial-panel/85 backdrop-blur-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-celestial-border px-5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lumi-accent/30 to-lumi-accent/10 text-lumi-accent ring-1 ring-lumi-accent/30">
            <Sparkles size={20} className="relative z-10" />
            <span className="absolute inset-0 rounded-xl bg-lumi-accent/10 blur-md" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight-custom text-text-primary">LumiOS</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">AI Companion</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition hover:bg-white/5 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(`${item.path}/`));
                  return (
                    <NavItem
                      key={item.path}
                      item={item}
                      active={active}
                      onClick={onClose}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Chat sessions */}
          {isChatPage && onNewSession && onSelectSession && onDeleteSession && (
            <div>
              <div className="mb-2 flex items-center justify-between px-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  会话
                </span>
              </div>
              <button
                onClick={onNewSession}
                className="mb-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-celestial-border-strong px-3 py-2 text-sm font-medium text-lumi-accent transition hover:bg-lumi-accent/10 hover:border-lumi-accent/30"
              >
                <Plus size={16} />
                新会话
              </button>
              <div className="space-y-0.5">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className={cn(
                      'group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                      activeSessionId === session.id
                        ? 'bg-white/[0.06] text-lumi-accent'
                        : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <MessageSquare size={14} className="shrink-0 text-text-tertiary" />
                      <span className="truncate">{session.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="shrink-0 opacity-0 text-text-tertiary transition hover:text-status-error group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="px-3 py-2 text-sm text-text-tertiary">暂无会话</p>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-celestial-border p-4">
          <Link
            to="/notifications"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition hover:bg-white/[0.04] hover:text-text-primary"
          >
            <Bell size={18} className="text-text-tertiary" />
            <span className="font-medium">通知中心</span>
            <NotificationBell hideIcon />
          </Link>
        </div>
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
  const navigate = useNavigate();

  return (
    <header className="flex h-16 items-center justify-between border-b border-celestial-border bg-celestial-panel/70 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="hidden h-8 w-px bg-celestial-border-strong lg:block" />
        <span className="text-base font-semibold text-text-primary">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={() => navigate('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
        >
          <Bell size={18} />
          <NotificationBell hideIcon className="absolute -right-0.5 -top-0.5" />
        </button>
      </div>
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
