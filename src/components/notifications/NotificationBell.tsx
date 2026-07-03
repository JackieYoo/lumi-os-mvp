import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';

export function NotificationBell({ onClick }: { onClick?: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = async () => {
    try {
      const count = await apiRequest<number>('GET', '/notifications/unread-count');
      setUnreadCount(count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCount();

    const socket = getSocket();
    const handleNotification = () => {
      setUnreadCount((prev) => prev + 1);
    };
    const handleRead = (payload: { notificationId?: string }) => {
      if (payload?.notificationId) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        loadCount();
      }
    };

    socket.on('notification', handleNotification);
    socket.on('notification:read', handleRead);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('notification:read', handleRead);
    };
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/5 hover:text-white"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
