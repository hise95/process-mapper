'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getStatusLabel } from '@/lib/enums';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProcessManager {
  fullName: string;
}

interface ProcessOwner {
  fullName: string;
}

interface Process {
  id: string;
  title: string;
  code: string | null;
  status: string;
  manager: ProcessManager | null;
  owner: ProcessOwner | null;
  updatedAt: string;
}

interface AnalystKanbanProps {
  processes: Process[];
}

export default function AnalystKanban({ processes }: AnalystKanbanProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm('Ви впевнені, що хочете видалити цю чернетку?')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/processes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Помилка при видаленні чернетки');
      }
    } catch (e) {
      console.error(e);
      alert('Виникла помилка при видаленні');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { 
      id: 'drafts', 
      title: 'Чернетки',
      statuses: ['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT']
    },
    { 
      id: 'analyst_review', 
      title: 'Перевірка аналітиком',
      statuses: ['PASSPORT_REVIEW_ANALYST', 'STEPS_REVIEW_ANALYST', 'KPIS_REVIEW_ANALYST', 'FINAL_APPROVAL_ANALYST']
    },
    { 
      id: 'owner_review', 
      title: 'Погодження власником',
      statuses: ['PASSPORT_REVIEW_OWNER', 'STEPS_REVIEW_OWNER', 'KPIS_REVIEW_OWNER']
    },
    { 
      id: 'approved', 
      title: 'Затверджено',
      statuses: ['APPROVED']
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(col => {
          const columnProcesses = processes.filter(p => col.statuses.includes(p.status));
          return (
            <div key={col.id} className="bg-muted/60 border border-border/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-sm text-foreground flex items-center gap-2">
                <span>{col.title}</span>
                <span className="bg-muted text-muted-foreground border border-border rounded-full px-2 py-0.5 text-xs font-bold">
                  {columnProcesses.length}
                </span>
              </h3>
              <div className="space-y-3">
                {columnProcesses.map(process => (
                  <Link key={process.id} href={`/processes/${process.id}`} className="block">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer relative group bg-card border border-border">
                      <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-sm leading-tight pr-6 text-foreground">{process.title}</CardTitle>
                          {col.id === 'drafts' && (
                            <button 
                              onClick={(e) => handleDelete(e, process.id)}
                              disabled={deletingId === process.id}
                              className="absolute top-3 right-3 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                              title="Видалити чернетку"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {process.code && (
                          <div className="text-xs text-muted-foreground font-mono mt-1">{process.code}</div>
                        )}
                        <Badge variant="outline" className="mt-2 text-[10px] py-0">{getStatusLabel(process.status)}</Badge>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-xs text-muted-foreground">
                        <div>{process.manager?.fullName ?? <span className="italic text-muted-foreground/60">Менеджер не призначений</span>}</div>
                        <div className="mt-2 text-muted-foreground/70">
                          Оновлено: {new Date(process.updatedAt).toLocaleDateString('uk-UA')}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
