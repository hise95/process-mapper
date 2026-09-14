'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarNavProps {
  canViewProcesses: boolean;
  canViewApprovals: boolean;
  isAdmin: boolean;
  pendingApprovalsCount?: number;
}

export function SidebarNav({ canViewProcesses, canViewApprovals, isAdmin, pendingApprovalsCount = 0 }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    // Точний збіг для дашборду та репозиторію
    if (path === '/dashboard' || path === '/repository' || path === '/admin' || path === '/approvals') {
      return pathname === path;
    }
    // Для процесів підсвічуємо і вкладені сторінки (наприклад, /processes/new)
    if (path === '/processes') {
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
      <Link href="/dashboard" className={linkClass('/dashboard')}>
        🏠 Дашборд
      </Link>
      
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
