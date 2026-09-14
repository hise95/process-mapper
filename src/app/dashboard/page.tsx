import { getSession } from '@/lib/auth';
import TopBar from '@/components/layout/TopBar';
import AnalystKanban from '@/components/dashboard/AnalystKanban';
import ManagerDraftList from '@/components/dashboard/ManagerDraftList';
import OwnerPendingApprovals from '@/components/dashboard/OwnerPendingApprovals';
import NotificationsWidget from '@/components/dashboard/NotificationsWidget';

import { prisma } from '@/lib/prisma';

async function fetchProcesses() {
  return await prisma.process.findMany({
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

import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const userRole = session.role;
  if (userRole === 'EMPLOYEE') {
    redirect('/repository');
  }

  const processes = await fetchProcesses();
  const notifications = await fetchNotifications(session.id);

  let content = null
  if (userRole === 'ADMIN_ANALYST') {
    const notifications = await fetchNotifications(session.id);
    content = <AnalystKanban processes={processes as any} notifications={notifications} />
  } else if (userRole === 'PROCESS_MANAGER') {
    content = <ManagerDraftList processes={processes.filter((p: any) => p.status === 'DRAFT') as any} />
  } else if (userRole === 'PROCESS_OWNER') {
    content = <OwnerPendingApprovals processes={processes.filter((p: any) => p.status === 'IN_REVIEW_OWNER') as any} />
  }


  return (
    <div className="space-y-6">
      <NotificationsWidget initialNotifications={notifications} />
      {content}
    </div>
  );
}
