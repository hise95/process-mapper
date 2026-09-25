import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import WikiContent from '@/components/wiki/WikiContent';

export default async function WikiPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">База знань</h1>
        <p className="text-muted-foreground mt-1">
          Документація, інструкції та відповіді на часті запитання (FAQ).
        </p>
      </div>

      <WikiContent 
        isEditor={session.role === 'ADMIN' || session.role === 'PROCESS_ANALYST' || session.role === 'ADMIN_ANALYST'} 
      />
    </div>
  );
}
