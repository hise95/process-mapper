import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { ArchitectureView } from '@/components/architecture/ArchitectureView';

export default async function ArchitecturePage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect('/login');
  }

  // Доступ лише для процесного аналітика / адміна
  if (!isAnalystOrAdmin(session.role)) {
    redirect('/dashboard');
  }

  return <ArchitectureView session={session} />;
}
