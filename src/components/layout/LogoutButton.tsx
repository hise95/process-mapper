'use client';

import { Button } from '@/components/ui/button';

export function LogoutButton({ className }: { className?: string }) {
  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/login';
  };

  return (
    <Button type="button" variant="ghost" className={className || "w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"} onClick={handleLogout}>
      🚪 Вийти
    </Button>
  );
}
