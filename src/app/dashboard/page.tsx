import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AnalystKanban from '@/components/dashboard/AnalystKanban';
import NotificationsWidget from '@/components/dashboard/NotificationsWidget';
import { prisma } from '@/lib/prisma';
import { Role } from '@/lib/enums';

async function fetchProcesses(session: { id: string; role: string }) {
  const where: Record<string, unknown> = {
    status: { not: 'ARCHIVED' }
  };

  if (session.role === Role.PROCESS_MANAGER) {
    where.managerId = session.id;
  } else if (session.role === Role.PROCESS_OWNER) {
    where.ownerId = session.id;
  }

  return await prisma.process.findMany({
    where,
    include: {
      manager: true,
      owner: true,
    },
    orderBy: { updatedAt: 'desc' }
  });
}

async function fetchNotifications(userId: string) {
  const notifs = await prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: 'desc' },
  });

  return notifs.map(n => ({
    id: n.id,
    message: n.message,
    date: n.createdAt.toISOString(),
    title: n.title,
    linkUrl: n.linkUrl
  }));
}

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { canCreateProcess } from '@/lib/permissions';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userRole = session.role;
  if (userRole === Role.EMPLOYEE) {
    redirect('/repository');
  }

  const processes = await fetchProcesses(session);
  const notifications = await fetchNotifications(session.id);
  const userCanCreate = canCreateProcess(session);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Статуси моїх процесів</h2>
      </div>

      <AnalystKanban processes={processes as any} />
    </div>
  );
}
