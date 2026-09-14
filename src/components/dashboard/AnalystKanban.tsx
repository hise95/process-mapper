'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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

interface Notification {
  id: string;
  message: string;
  date: string;
}

interface AnalystKanbanProps {
  processes: Process[];
  notifications: Notification[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  'DRAFT':             { label: 'Чернетка',        color: 'bg-gray-500' },
  'IN_REVIEW_ANALYST': { label: 'На перевірці',    color: 'bg-yellow-500' },
  'IN_REVIEW_OWNER':   { label: 'На погодженні',   color: 'bg-orange-500' },
  'APPROVED':          { label: 'Затверджено',     color: 'bg-green-500' },
  'ARCHIVED':          { label: 'Архів',           color: 'bg-slate-500' },
};

export default function AnalystKanban({ processes, notifications }: AnalystKanbanProps) {
  const columns = [
    { id: 'DRAFT',             title: 'Чернетки' },
    { id: 'IN_REVIEW_ANALYST', title: 'На перевірці аналітика' },
    { id: 'IN_REVIEW_OWNER',   title: 'На погодженні власника' },
    { id: 'APPROVED',          title: 'Затверджено' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(col => (
          <div key={col.id} className="bg-slate-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-sm text-slate-700 flex items-center gap-2">
              <span>{col.title}</span>
              <span className="bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 text-xs font-bold">
                {processes.filter(p => p.status === col.id).length}
              </span>
            </h3>
            <div className="space-y-3">
              {processes.filter(p => p.status === col.id).map(process => (
                <Link key={process.id} href={`/processes/${process.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm leading-tight">{process.title}</CardTitle>
                      {process.code && (
                        <div className="text-xs text-slate-500 font-mono mt-1">{process.code}</div>
                      )}
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-xs text-slate-600">
                      {/* Виправлено: manager.fullName замість managerName */}
                      <div>{process.manager?.fullName ?? <span className="italic text-slate-400">Менеджер не призначений</span>}</div>
                      <div className="mt-2 text-slate-400">
                        Оновлено: {new Date(process.updatedAt).toLocaleDateString('uk-UA')}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
