import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { ROLES_UA } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { LogoutButton } from './LogoutButton';
import { SidebarNav } from './SidebarNav';

export default async function Sidebar() {
  const session = await getSession();
  if (!session) return null;

  const user = session;

  const canViewProcesses = session.role === 'PROCESS_MANAGER' || session.role === 'ADMIN_ANALYST' || session.role === 'PROCESS_OWNER';
  const canViewApprovals = session.role === 'PROCESS_OWNER' || session.role === 'ADMIN_ANALYST';
  const isAdmin = session.role === 'ADMIN_ANALYST';

  let pendingApprovalsCount = 0;
  if (canViewApprovals) {
    const { prisma } = await import('@/lib/prisma');
    if (session.role === 'ADMIN_ANALYST') {
      pendingApprovalsCount = await prisma.process.count({
        where: { status: { in: ['IN_REVIEW_ANALYST', 'IN_REVIEW_OWNER'] } }
      });
    } else if (session.role === 'PROCESS_OWNER') {
      pendingApprovalsCount = await prisma.process.count({
        where: { status: 'IN_REVIEW_OWNER', ownerId: session.id }
      });
    }
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1f1f1f] text-white flex flex-col shadow-xl z-20">
      <div className="p-4 border-b border-[#333333]">
        <h1 className="font-bold text-base text-[#ffd100] whitespace-nowrap tracking-tight">🗺️ Process Mapper AS-IS</h1>
      </div>
      
      <div className="p-4 border-b border-[#333333]">
        <p className="font-medium truncate text-white">{session.fullName}</p>
        <Badge className="mt-2 bg-[#fa4616] text-white hover:bg-[#d93a10] border-none">
          {ROLES_UA[session.role as keyof typeof ROLES_UA] || session.role}
        </Badge>
      </div>

      <SidebarNav 
        canViewProcesses={canViewProcesses} 
        canViewApprovals={canViewApprovals} 
        isAdmin={isAdmin} 
        pendingApprovalsCount={pendingApprovalsCount}
      />

      <div className="p-4 border-t border-[#333333]">
        <LogoutButton />
      </div>
    </aside>
  );
}
