import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ProcessBuilderTabs from '@/components/process-builder/ProcessBuilderTabs';

import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { canEditProcess } from '@/lib/permissions';

export default async function ProcessEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect('/login');
  }

  const processData = await prisma.process.findUnique({
    where: { id },
    include: {
      steps:       { orderBy: { orderIndex: 'asc' } },
      kpis:        true,
      manager:     { select: { id: true, fullName: true, email: true } },
      owner:       { select: { id: true, fullName: true, email: true } },
      level:       { select: { id: true, name: true, depth: true, parent: { select: { id: true, name: true } } } },
      historyLogs: { select: { action: true, timestamp: true }, orderBy: { timestamp: 'desc' } },
    }
  });

  if (!processData) {
    return notFound();
  }

  if (!canEditProcess(session, processData)) {
    return <div className="p-8 text-red-500">Доступ заборонено</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/processes" className="hover:underline">Процеси</Link>
        {' / '}
        <Link href={`/processes/${id}`} className="hover:underline">{processData.title || 'Процес'}</Link>
        {' / '}
        <span>Редагування</span>
      </nav>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {processData.title || 'Новий процес'} 
          <span className="text-muted-foreground text-lg ml-2">(v{processData.version || '1.0'})</span>
        </h1>
      </div>

      <ProcessBuilderTabs process={processData} />
    </div>
  );
}
