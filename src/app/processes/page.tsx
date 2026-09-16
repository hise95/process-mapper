import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { canCreateProcess } from '@/lib/permissions';
import { ProcessTableClient } from '@/components/processes/ProcessTableClient';

export default async function ProcessesPage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect('/login');
  }

  // Побудова where-умови залежно від ролі
  const where =
    session.role === 'PROCESS_MANAGER' ? { managerId: session.id } :
    session.role === 'PROCESS_OWNER'   ? { ownerId: session.id }   :
    {};  // ADMIN_ANALYST — бачить усі

  const processes = await prisma.process.findMany({
    where,
    include: {
      level:   { select: { name: true } },
      manager: { select: { fullName: true } },
      owner:   { select: { fullName: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const userCanCreate = canCreateProcess(session);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {session.role === 'PROCESS_MANAGER' ? 'Мої процеси' : 'Всі процеси компанії'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Керування, перегляд та редагування бізнес-процесів
          </p>
        </div>
      </div>

      <React.Suspense fallback={<div>Завантаження таблиці...</div>}>
        <ProcessTableClient processes={processes} session={session} />
      </React.Suspense>
    </div>
  );
}
