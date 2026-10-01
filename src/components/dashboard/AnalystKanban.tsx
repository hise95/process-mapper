'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getStatusLabel, PROCESS_STATUS_LABELS } from '@/lib/enums';
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
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Помилка при видаленні чернетки');
      }
    } catch (e) {
      console.error(e);
      alert('Виникла помилка при видаленні');
    } finally {
      setDeletingId(null);
    }
  };

  const [viewMode, setViewMode] = useState<'phases' | 'statuses'>('phases');

  const columnsPhases = [
    { 
      id: 'passport', 
      title: '1. Паспорт процесу',
      statuses: ['DRAFT', 'PASSPORT_REVIEW_ANALYST', 'PASSPORT_REVIEW_OWNER']
    },
    { 
      id: 'steps', 
      title: '2. Опис кроків (BPMN)',
      statuses: ['STEPS_DRAFT', 'STEPS_REVIEW_ANALYST', 'STEPS_REVIEW_OWNER']
    },
    { 
      id: 'kpis', 
      title: '3. Показники процесу',
      statuses: ['KPIS_DRAFT', 'KPIS_REVIEW_ANALYST', 'KPIS_REVIEW_OWNER', 'FINAL_APPROVAL_ANALYST']
    },
    { 
      id: 'approved', 
      title: 'Затверджено',
      statuses: ['APPROVED']
    },
  ];

  const columnsStatuses = [
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

  const activeColumns = viewMode === 'phases' ? columnsPhases : columnsStatuses;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Статуси моїх процесів</h2>
        <div className="inline-flex items-center rounded-md border border-border p-1 bg-muted/30">
          <button
            onClick={() => setViewMode('phases')}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'phases' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Етапи процесів
          </button>
          <button
            onClick={() => setViewMode('statuses')}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'statuses' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Статуси процесів
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activeColumns.map(col => {
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
                          {['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT'].includes(process.status) && (
                            <button
                              onClick={(e) => handleDelete(e, process.id)}
                              className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Видалити чернетку"
                              disabled={deletingId === process.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {process.code && (
                          <p className="text-xs text-muted-foreground font-mono mt-1 mb-2">{process.code}</p>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className={`text-[10px] ${PROCESS_STATUS_LABELS[process.status]?.color || ''}`}>
                            {PROCESS_STATUS_LABELS[process.status]?.label || process.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 flex justify-between items-end">
                        <div className="text-xs text-muted-foreground">
                          <p>{process.manager?.fullName || 'Не вказано'}</p>
                          <p className="mt-1">Оновлено: {new Date(process.updatedAt).toLocaleDateString('uk-UA')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {columnProcesses.length === 0 && (
                  <p className="text-sm text-muted-foreground/60 text-center py-4 italic">
                    Немає процесів
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
