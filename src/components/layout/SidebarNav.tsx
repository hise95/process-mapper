'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';

interface SidebarNavProps {
  canViewDashboard?: boolean;
  canViewProcesses: boolean;
  canViewApprovals: boolean;
  isAdmin: boolean;
  pendingApprovalsCount?: number;
  notificationsCount?: number;
  canCreate?: boolean;
}

export function SidebarNav({ 
  canViewDashboard = true, 
  canViewProcesses, 
  canViewApprovals, 
  isAdmin, 
  pendingApprovalsCount = 0,
  notificationsCount = 0,
  canCreate = false
}: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    // Точний збіг для дашборду та репозиторію
    if (path === '/dashboard' || path === '/repository' || path === '/admin' || path === '/approvals' || path === '/notifications') {
      return pathname === path;
    }
    // Для процесів підсвічуємо і вкладені сторінки (наприклад, /processes/new)
    if (path === '/processes' && pathname !== '/processes/new') {
      return pathname.startsWith('/processes');
    }
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) => `block px-3 py-2 rounded-md transition-colors font-medium ${
    isActive(path) 
      ? 'bg-[#333333] text-[#ffd100] border-l-4 border-[#fa4616]' 
      : 'text-slate-300 hover:bg-[#333333] hover:text-white border-l-4 border-transparent'
  }`;

  return (
    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
      {canCreate && (
        <div className="mb-6">
          <Link href="/processes/new" className="block">
            <Button className="w-full bg-[#fa4616] hover:bg-[#d93a10] text-white font-medium shadow-xs">
              + Створити процес
            </Button>
          </Link>
        </div>
      )}

      {canViewDashboard && (
        <Link href="/dashboard" className={linkClass('/dashboard')}>
          🏠 Дашборд
        </Link>
      )}

      {canViewProcesses && (
        <Link href="/processes" className={linkClass('/processes')}>
          📋 Мої процеси
        </Link>
      )}
      
      {canViewApprovals && (
        <Link href="/approvals" className={`${linkClass('/approvals')} flex justify-between items-center`}>
          <span>✅ Погодження</span>
          {pendingApprovalsCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingApprovalsCount}
            </span>
          )}
        </Link>
      )}
      
      <Link href="/repository" className={linkClass('/repository')}>
        📚 Репозиторій
      </Link>

      <Link href="/notifications" className={`${linkClass('/notifications')} flex justify-between items-center`}>
        <span>🔔 Сповіщення</span>
        {notificationsCount > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {notificationsCount}
          </span>
        )}
      </Link>
      
      {isAdmin && (
        <div className="pt-4 mt-4 border-t border-[#333333]">
          <Link href="/admin" className={linkClass('/admin')}>
            ⚙️ Адмін-панель
          </Link>
        </div>
      )}
    </nav>
  );
}
