import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { SidebarNav } from './SidebarNav';

export default async function Sidebar() {
  const session = await getSession();
  if (!session) return null;

  const user = session;

  const isAnalystOrAdmin = session.role === 'PROCESS_ANALYST' || session.role === 'ADMIN_ANALYST' || session.role === 'ADMIN';
  const canViewProcesses = session.role === 'PROCESS_MANAGER' || isAnalystOrAdmin || session.role === 'PROCESS_OWNER';
  const canViewApprovals = session.role === 'PROCESS_OWNER' || isAnalystOrAdmin;
  const isAdmin = session.role === 'ADMIN';

  const { prisma } = await import('@/lib/prisma');
  let pendingApprovalsCount = 0;
  if (canViewApprovals) {
    if (isAnalystOrAdmin) {
      pendingApprovalsCount = await prisma.process.count({
        where: { status: { in: ['PASSPORT_REVIEW_ANALYST', 'STEPS_REVIEW_ANALYST', 'KPIS_REVIEW_ANALYST', 'FINAL_APPROVAL_ANALYST'] } }
      });
    } else if (session.role === 'PROCESS_OWNER') {
      pendingApprovalsCount = await prisma.process.count({
        where: { status: { in: ['PASSPORT_REVIEW_OWNER', 'STEPS_REVIEW_OWNER', 'KPIS_REVIEW_OWNER'] }, ownerId: session.id }
      });
    }
  }

  const notificationsCount = await prisma.notification.count({
    where: { userId: session.id, isRead: false }
  });

  const { canCreateProcess } = await import('@/lib/permissions');
  const userCanCreate = canCreateProcess(session);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1f1f1f] text-white flex flex-col shadow-xl z-20">
      <div className="flex items-center px-4 h-[57px] border-b border-[#333333] shrink-0">
        <h1 className="font-bold text-base text-[#ffd100] whitespace-nowrap tracking-tight">🗺️ Process Mapper AS-IS</h1>
      </div>
      
      <SidebarNav 
        canViewDashboard={true}
        canViewProcesses={canViewProcesses} 
        canViewApprovals={canViewApprovals} 
        canViewArchitecture={isAnalystOrAdmin}
        isAdmin={isAdmin} 
        isAnalyst={isAnalystOrAdmin}
        pendingApprovalsCount={pendingApprovalsCount}
        notificationsCount={notificationsCount}
        canCreate={userCanCreate}
      />
    </aside>
  );
}
