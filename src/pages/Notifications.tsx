import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, ArrowLeft } from 'lucide-react';
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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
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
      <div className="mx-auto flex h-full max-w-2xl flex-col gap-3 overflow-y-auto p-4">
        {loading && (
          <p className="text-center text-sm text-text-tertiary">加载中…</p>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-text-tertiary">
            <Bell size={32} />
            <p>暂无通知</p>
          </div>
        )}

        {notifications.map((n) => (
          <Card
            key={n.id}
            className={`border-celestial-border ${n.read ? 'opacity-70' : ''}`}
          >
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-lumi-accent"></span>
                  )}
                  <span className="font-medium text-white">{n.title}</span>
                  <span className="text-xs text-text-tertiary">
                    {new Date(n.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{n.body}</p>
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
                  className="h-8 w-8 text-red-400 hover:text-red-300"
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
