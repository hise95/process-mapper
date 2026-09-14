'use client';

import { usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';

import { LogoutButton } from './LogoutButton';

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
    if (path === '/admin') return 'Адмін-панель';
    return '';
  };

  const containerClass = isEmployee 
    ? "flex-1 flex flex-col min-h-screen relative w-full overflow-hidden" 
    : "flex-1 ml-64 flex flex-col min-h-screen relative max-w-[calc(100vw-16rem)] overflow-hidden";

  return (
    <div className="flex min-h-screen bg-slate-50/50 font-sans">
      {sidebar}
      <div className={containerClass}>
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-4">
            {isEmployee && (
               <h1 className="font-bold text-base text-[#fa4616] tracking-tight mr-4">🗺️ Process Mapper AS-IS</h1>
            )}
            <h1 className="text-xl font-bold tracking-tight text-slate-800">{getPageTitle(pathname)}</h1>
          </div>
          <div className="flex items-center gap-4">
            <SearchBar />
            {isEmployee && (
              <div className="flex items-center gap-4 border-l pl-4 ml-2 border-slate-300">
                <span className="text-sm font-medium text-slate-700">{user?.fullName}</span>
                <LogoutButton className="text-red-500 hover:text-red-600 hover:bg-red-50" />
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
