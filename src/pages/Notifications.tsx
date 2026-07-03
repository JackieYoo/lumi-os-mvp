import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent } from '../components/ui/Card.js';
import { apiRequest } from '../lib/api.js';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await apiRequest<NotificationItem[]>('GET', '/notifications');
      setNotifications(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiRequest('POST', `/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // handled
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest('POST', '/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('全部已读');
    } catch {
      // handled
    }
  };

  const remove = async (id: string) => {
    try {
      await apiRequest('DELETE', `/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // handled
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppLayout
      title="通知中心"
      sidebarProps={{ sessions: [] }}
      actions={
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <Check size={14} /> 全部已读
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat')}>
            <ArrowLeft size={14} /> 返回
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col gap-5 overflow-y-auto p-4 lg:p-6">
        <Card className="overflow-hidden">
          <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-lumi-accent/10 to-transparent" />
          <CardContent className="relative flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lumi-accent/10 text-lumi-accent ring-1 ring-lumi-accent/20">
                <Bell size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">系统通知</h2>
                <p className="mt-1 text-sm text-text-tertiary">任务、知识库与系统状态会在这里提醒你</p>
              </div>
            </div>
            <div className="rounded-xl border border-celestial-border bg-celestial-deep/40 px-4 py-2 text-sm text-text-secondary">
              未读 <span className="font-semibold text-text-primary">{unreadCount}</span>
            </div>
          </CardContent>
        </Card>

        {loading && <p className="py-12 text-center text-sm text-text-tertiary">加载中…</p>}

        {!loading && notifications.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-text-tertiary">
              <Sparkles size={32} className="text-lumi-accent/60" />
              <p className="text-base font-medium text-text-primary">暂无通知</p>
              <p className="text-sm">一切都很安静。</p>
            </CardContent>
          </Card>
        )}

        {notifications.map((n) => (
          <Card key={n.id} className={n.read ? 'opacity-70' : 'ring-1 ring-lumi-accent/10'}>
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!n.read && <span className="h-2 w-2 rounded-full bg-lumi-accent animate-pulse" />}
                  <span className="font-medium text-text-primary">{n.title}</span>
                  <span className="text-xs text-text-tertiary">{new Date(n.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{n.body}</p>
              </div>
              <div className="flex items-center gap-1">
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => markRead(n.id)}
                    className="h-8 w-8 text-lumi-accent hover:text-lumi-accent"
                  >
                    <Check size={14} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(n.id)}
                  className="h-8 w-8 text-status-error hover:text-status-error"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
