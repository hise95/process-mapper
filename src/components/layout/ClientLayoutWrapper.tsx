'use client';

import { usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';

import { LogoutButton } from './LogoutButton';

import { ThemeToggle } from '@/components/ThemeToggle';

export function ClientLayoutWrapper({ 
  children, 
  sidebar,
  isEmployee,
  user
}: { 
  children: React.ReactNode; 
  sidebar: React.ReactNode; 
  isEmployee?: boolean;
  user?: any;
}) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Дашборд';
    if (path.startsWith('/processes/new')) return 'Створення процесу';
    if (path.includes('/edit')) return 'Редагування процесу';
    if (path.startsWith('/processes/')) return 'Перегляд процесу';
    if (path === '/processes') return 'Мої процеси';
    if (path === '/approvals') return 'Погодження';
    if (path === '/repository') return 'Репозиторій процесів';
    if (path === '/architecture') return 'Архітектура процесів';
    if (path === '/admin') return 'Адмін-панель';
    if (path === '/notifications') return 'Сповіщення';
    return '';
  };

  const containerClass = isEmployee 
    ? "flex-1 flex flex-col min-h-screen relative w-full overflow-hidden" 
    : "flex-1 ml-64 flex flex-col min-h-screen relative max-w-[calc(100vw-16rem)] overflow-hidden";

  const ROLES_UA: Record<string, string> = {
    ADMIN: 'Адміністратор',
    PROCESS_ANALYST: 'Процесний аналітик',
    ADMIN_ANALYST: 'Процесний аналітик',
    PROCESS_MANAGER: 'Менеджер процесу',
    PROCESS_OWNER: 'Власник процесу',
    EMPLOYEE: 'Працівник',
  };

  return (
    <div className="flex min-h-screen bg-background font-sans transition-colors">
      {sidebar}
      <div className={containerClass}>
        <header className="sticky top-0 z-10 grid grid-cols-3 items-center px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border transition-colors">
          <div className="flex items-center gap-4 justify-start">
            {isEmployee && (
               <h1 className="font-bold text-base text-[#fa4616] tracking-tight mr-4">🗺️ Process Mapper AS-IS</h1>
            )}
            <h1 className="text-xl font-bold tracking-tight text-foreground">{getPageTitle(pathname)}</h1>
          </div>
          <div className="flex justify-center">
            <SearchBar />
          </div>
          <div className="flex items-center gap-4 justify-end">
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-4 border-l pl-4 border-border">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-foreground">{user.fullName}</span>
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md mt-0.5">
                    {ROLES_UA[user.role] || user.role}
                  </span>
                </div>
                <LogoutButton className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 p-2 ml-2 rounded-full transition-colors" />
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
