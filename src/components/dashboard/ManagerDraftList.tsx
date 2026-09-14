'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface Process {
  id: string;
  title: string;
  code: string;
  status: string;
  updatedAt: string;
}

interface ManagerDraftListProps {
  processes: Process[];
}

export default function ManagerDraftList({ processes }: ManagerDraftListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Мої чернетки</h2>
        <Link href="/processes/new">
          <Button>+ Створити процес</Button>
        </Link>
      </div>

      {processes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Немає чернеток. Створіть перший процес.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processes.map(process => (
            <Card key={process.id} className="hover:shadow-md transition-shadow flex flex-col group">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg leading-tight">{process.title}</CardTitle>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-gray-500 shrink-0">Чернетка</Badge>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleDelete(process.id); }}
                      disabled={deletingId === process.id}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Видалити чернетку"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm font-mono text-slate-500">{process.code || '—'}</div>
              </CardHeader>
              <CardContent className="mt-auto pt-4">
                <div className="text-sm text-slate-500 mb-4">
                  Оновлено: {new Date(process.updatedAt).toLocaleDateString('uk-UA')}
                </div>
                <Link href={`/processes/${process.id}/edit`} className="block w-full">
                  <Button variant="outline" className="w-full">Редагувати</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
