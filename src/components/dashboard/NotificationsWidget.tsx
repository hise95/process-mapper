'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  linkUrl: string | null;
}

export default function NotificationsWidget({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const router = useRouter();

  const markAsRead = async (id: string, linkUrl: string | null) => {
    await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id }) });
    setNotifications(n => n.filter(x => x.id !== id));
    if (linkUrl) {
      router.push(linkUrl);
    }
  };

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">Сповіщення <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{notifications.length}</span></h2>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>Прочитати все</Button>
      </div>
      <div className="grid gap-3">
        {notifications.map(n => (
          <div key={n.id} onClick={() => markAsRead(n.id, n.linkUrl)} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary hover:shadow-sm transition-all">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground">{n.title}</h4>
              <span className="text-xs text-muted-foreground">{new Date(n.date).toLocaleDateString('uk-UA')}</span>
            </div>
            <p className="text-sm text-muted-foreground">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
