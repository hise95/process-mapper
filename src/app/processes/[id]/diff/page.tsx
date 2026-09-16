import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PROCESS_TYPE_LABELS, getStatusLabel } from '@/lib/enums';

export default async function ProcessDiffPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  const { id } = await params;

  const current = await prisma.process.findUnique({
    where: { id },
    include: { steps: { orderBy: { orderIndex: 'asc' } }, kpis: true },
  });

  if (!current || !current.previousVersionId) {
    return notFound();
  }

  const prev = await prisma.process.findUnique({
    where: { id: current.previousVersionId },
    include: { steps: { orderBy: { orderIndex: 'asc' } }, kpis: true },
  });

  if (!prev) {
    return notFound();
  }

  // Функція для підсвічування різниці (простий diff)
  const DiffField = ({ label, oldVal, newVal }: { label: string, oldVal: string | null, newVal: string | null }) => {
    if (oldVal === newVal) {
      return (
        <div className="py-2 border-b last:border-0">
          <span className="font-semibold text-slate-700">{label}:</span> <span className="text-slate-600">{newVal || '-'}</span>
        </div>
      );
    }
    return (
      <div className="py-2 border-b last:border-0">
        <span className="font-semibold text-slate-700">{label}:</span>
        <div className="mt-1 flex flex-col gap-1 text-sm">
          <div className="bg-red-50 text-red-700 p-2 rounded line-through border border-red-100">
            {oldVal || '(порожньо)'}
          </div>
          <div className="bg-green-50 text-green-700 p-2 rounded border border-green-100">
            {newVal || '(порожньо)'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Порівняння версій</h1>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline" className="bg-slate-100">
              Попередня: v{prev.version} ({getStatusLabel(prev.status)})
            </Badge>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <Badge className="bg-[#fa4616] text-white">
              Поточна: v{current.version} ({getStatusLabel(current.status)})
            </Badge>
          </div>
        </div>
        <Link href={`/processes/${current.id}`}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Назад до процесу</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Паспорт процесу</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <DiffField label="Назва" oldVal={prev.title} newVal={current.title} />
          <DiffField label="Код" oldVal={prev.code} newVal={current.code} />
          <DiffField label="Тип" oldVal={prev.processType ? (PROCESS_TYPE_LABELS[prev.processType] || prev.processType) : null} newVal={current.processType ? (PROCESS_TYPE_LABELS[current.processType] || current.processType) : null} />
          <DiffField label="Мета" oldVal={prev.objective} newVal={current.objective} />
          <DiffField label="Вхід" oldVal={prev.input} newVal={current.input} />
          <DiffField label="Вихід" oldVal={prev.output} newVal={current.output} />
          <DiffField label="Учасники" oldVal={prev.participants} newVal={current.participants} />
          <DiffField label="Клієнти" oldVal={prev.clients} newVal={current.clients} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Зміни в кроках (AS-IS)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700">Було (v{prev.version}):</h3>
            <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-2">
              {prev.steps.length === 0 && <p className="text-muted-foreground">Немає кроків</p>}
              {prev.steps.map((s, i) => (
                <div key={s.id} className="flex gap-2">
                  <span className="font-mono text-slate-400">{i + 1}.</span>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-slate-500">— {s.executorRole}</span>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-slate-700 mt-6">Стало (v{current.version}):</h3>
            <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-2">
              {current.steps.length === 0 && <p className="text-muted-foreground">Немає кроків</p>}
              {current.steps.map((s, i) => {
                // Шукаємо цей крок у старій версії за назвою, щоб підсвітити як новий
                const isNew = !prev.steps.find(ps => ps.name === s.name);
                return (
                  <div key={s.id} className={`flex gap-2 p-1 rounded ${isNew ? 'bg-green-100 text-green-800' : ''}`}>
                    <span className="font-mono text-slate-400">{i + 1}.</span>
                    <span className="font-medium">{s.name} {isNew && <Badge className="ml-2 bg-green-500 text-[10px]">Новий</Badge>}</span>
                    <span className="text-slate-500">— {s.executorRole}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Показники процесу</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700">Було (v{prev.version}):</h3>
            <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-2">
              {prev.kpis.length === 0 && <p className="text-muted-foreground">Немає показників</p>}
              {prev.kpis.map((k) => (
                <div key={k.id} className="flex gap-2">
                  <span className="font-medium">{k.name}</span>
                  <span className="text-slate-500">— {k.targetValue || '-'} ({k.unit || '-'})</span>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-slate-700 mt-6">Стало (v{current.version}):</h3>
            <div className="bg-slate-50 p-4 rounded-md border text-sm space-y-2">
              {current.kpis.length === 0 && <p className="text-muted-foreground">Немає показників</p>}
              {current.kpis.map((k) => {
                const isNew = !prev.kpis.find(pk => pk.name === k.name);
                return (
                  <div key={k.id} className={`flex gap-2 p-1 rounded ${isNew ? 'bg-green-100 text-green-800' : ''}`}>
                    <span className="font-medium">{k.name} {isNew && <Badge className="ml-2 bg-green-500 text-[10px]">Новий</Badge>}</span>
                    <span className="text-slate-500">— {k.targetValue || '-'} ({k.unit || '-'})</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
