import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import AnalystKanbanBoard from '@/components/analyst-board/AnalystKanbanBoard';

export default async function AnalystBoardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!isAnalystOrAdmin(session.role)) redirect('/dashboard');

  const tasks = await prisma.analystTask.findMany({
    orderBy: { createdAt: 'desc' },
    include: { 
      assignee: { select: { fullName: true } },
      author: { select: { fullName: true } }
    }
  });

  const analysts = await prisma.user.findMany({
    where: { role: { in: ['PROCESS_ANALYST', 'ADMIN_ANALYST', 'ADMIN'] } },
    select: { id: true, fullName: true }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Дошка аналітиків</h1>
        <p className="text-muted-foreground mt-1">Канбан-дошка для внутрішніх задач та планування роботи процесних аналітиків.</p>
      </div>
      
      <AnalystKanbanBoard initialTasks={tasks} analysts={analysts} currentUser={session} />
    </div>
  );
}
