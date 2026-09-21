import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { ArchiveView } from '@/components/archive/ArchiveView';
import { Archive } from 'lucide-react';

export const metadata = {
  title: 'Архів процесів | Process Mapper',
  description: 'Архів застарілих та деактивованих бізнес-процесів',
};

export default async function ArchivePage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect('/login');
  }

  if (!isAnalystOrAdmin(session.role)) {
    return (
      <div className="container mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Archive className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Доступ заборонено</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Розділ архіву доступний виключно для Процесного аналітика або Адміністратора системи.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-[1400px]">
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center gap-2.5 text-foreground">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Архів бізнес-процесів</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Спеціальний розділ для аналітика: виведені з експлуатації або застарілі процеси компанії з можливістю відновлення.
            </p>
          </div>
        </div>
      </div>

      <ArchiveView />
    </div>
  );
}
