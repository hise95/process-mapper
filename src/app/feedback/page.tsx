import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import FeedbackList from '@/components/feedback/FeedbackList';

export default async function FeedbackPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!isAnalystOrAdmin(session.role)) redirect('/dashboard');

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, role: true } } }
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Звернення користувачів</h1>
        <p className="text-muted-foreground mt-1">Опрацювання багів, питань та пропозицій.</p>
      </div>
      
      <FeedbackList initialFeedbacks={feedbacks} />
    </div>
  );
}
