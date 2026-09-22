import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import NotificationsWidget from '@/components/dashboard/NotificationsWidget';

async function fetchNotifications(userId: string) {
  const notifs = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return notifs.map(n => ({
    id: n.id,
    message: n.message,
    date: n.createdAt.toISOString(),
    title: n.title,
    linkUrl: n.linkUrl,
    isRead: n.isRead
  }));
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const notifications = await fetchNotifications(session.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {notifications.length > 0 ? (
        <NotificationsWidget initialNotifications={notifications} />
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-6 text-foreground">Сповіщення</h2>
          <div className="text-center py-12 bg-card border border-border rounded-lg shadow-sm">
            <p className="text-muted-foreground">У вас немає нових сповіщень.</p>
          </div>
        </div>
      )}
    </div>
  );
}
