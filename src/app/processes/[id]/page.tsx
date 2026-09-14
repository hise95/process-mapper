import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { canEditProcess } from '@/lib/permissions';
import { ProcessActionButton } from '@/components/process-builder/ProcessActionButton';

export default async function ProcessViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession().catch(() => null);
  
  const process = await prisma.process.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { orderIndex: 'asc' } },
      kpis: true,
      historyLogs: { orderBy: { timestamp: 'desc' }, include: { user: true } },
      manager: true,
      owner: true,
      level: true,
    }
  });

  if (!process) {
    return notFound();
  }

  const canEdit = session ? canEditProcess(session, process) : false;
  const canCreateVersion = process.status === 'APPROVED' && canEdit;
  const canSubmit = process.status === 'DRAFT' && canEdit;

  // Отримати всі версії поточного процесу
  async function getVersionHistory(currentId: string, currentPrevId: string | null) {
    const versions = [];
    let curr: any = { id: currentId, previousVersionId: currentPrevId };
    
    // Йдемо назад до кореня
    while (curr?.previousVersionId) {
      curr = await prisma.process.findUnique({ where: { id: curr.previousVersionId }, select: { id: true, previousVersionId: true, version: true, status: true, title: true, createdAt: true } });
    }
    
    // Якщо кореня немає, повертаємо тільки поточний
    if (!curr) return [];
    
    versions.push(curr);
    let nextId = curr.id;
    // Йдемо вперед по ланцюжку
    while (true) {
      const next = await prisma.process.findFirst({ where: { previousVersionId: nextId }, select: { id: true, previousVersionId: true, version: true, status: true, title: true, createdAt: true } });
      if (!next) break;
      versions.push(next);
      nextId = next.id;
    }
    
    return versions.sort((a, b) => b.version - a.version);
  }

  const versions = await getVersionHistory(process.id, process.previousVersionId);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground font-mono">{process.code || 'БЕЗ КОДУ'}</span>
            <Badge variant="outline">{process.processType || 'Не вказано'}</Badge>
            <Badge className={`border-none ${process.status === 'ARCHIVED' ? 'bg-slate-500' : 'bg-[#fa4616] text-white hover:bg-[#d93a10]'}`}>{process.status}</Badge>
            {process.status === 'ARCHIVED' && (
              <Badge variant="destructive">Застаріла версія</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">
            {process.title} <span className="text-muted-foreground text-lg">(v{process.version || '1.0'})</span>
          </h1>
          
          {versions.length > 1 && (
            <div className="mt-4 p-3 bg-slate-50 border rounded-md max-w-lg">
              <h4 className="text-sm font-semibold mb-2 text-slate-700">Історія версій:</h4>
              <div className="flex flex-col gap-1 text-sm">
                {versions.map(v => (
                  <div key={v.id} className="flex items-center gap-2">
                    {v.id === process.id ? (
                      <span className="font-bold text-[#fa4616]">v{v.version} — Поточна сторінка ({v.status})</span>
                    ) : (
                      <Link href={`/processes/${v.id}`} className="text-blue-600 hover:underline">
                        v{v.version} — {v.status} 
                      </Link>
                    )}
                    {v.status === 'ARCHIVED' && <span className="text-xs text-slate-500 ml-auto">Архівована</span>}
                    {v.status === 'APPROVED' && <span className="text-xs text-green-600 font-medium ml-auto">Актуальна</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-x-2 shrink-0">
          {process.previousVersionId && (
            <Link href={`/processes/${id}/diff`}>
              <Button variant="secondary" className="mr-2">⚖️ Порівняти версії</Button>
            </Link>
          )}
          {canEdit && (
            <Link href={`/processes/${id}/edit`}>
              <Button variant="outline">Редагувати</Button>
            </Link>
          )}
          {process.status === 'APPROVED' && canCreateVersion && (
            <ProcessActionButton
              label="Створити нову версію"
              url={`/api/processes/${id}/version`}
              body={{}}
              method="POST"
            />
          )}
          {process.status === 'DRAFT' && canSubmit && (
            <ProcessActionButton
              label="Подати на перевірку"
              url={`/api/processes/${id}/approve`}
              body={{ transition: 'SUBMIT_FOR_ANALYST' }}
              method="POST"
              className="bg-[#fa4616] hover:bg-[#d93a10] text-white"
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Паспорт процесу</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><span className="font-semibold">Код:</span> {process.code || '-'}</div>
          <div><span className="font-semibold">Тип:</span> {process.processType || '-'}</div>
          <div><span className="font-semibold">Менеджер:</span> {process.manager?.fullName || '-'}</div>
          <div><span className="font-semibold">Власник:</span> {process.owner?.fullName || '-'}</div>
          <div className="col-span-2"><span className="font-semibold">Мета:</span> <p className="text-slate-700 whitespace-pre-wrap">{process.objective || '-'}</p></div>
          <div className="col-span-2"><span className="font-semibold">Вхід:</span> <p className="text-slate-700 whitespace-pre-wrap">{process.input || '-'}</p></div>
          <div className="col-span-2"><span className="font-semibold">Вихід:</span> <p className="text-slate-700 whitespace-pre-wrap">{process.output || '-'}</p></div>
          <div className="col-span-2"><span className="font-semibold">Учасники:</span> <p className="text-slate-700 whitespace-pre-wrap">{process.participants || '-'}</p></div>
          <div className="col-span-2"><span className="font-semibold">Клієнти:</span> <p className="text-slate-700 whitespace-pre-wrap">{process.clients || '-'}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Кроки AS-IS</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Назва кроку</TableHead>
                <TableHead>Опис</TableHead>
                <TableHead>Хто виконує</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(process.steps || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    Кроки ще не додані
                  </TableCell>
                </TableRow>
              ) : (
                process.steps.map((step, idx) => (
                  <TableRow key={step.id}>
                    <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{step.name}</TableCell>
                    <TableCell>{step.description || '-'}</TableCell>
                    <TableCell>{step.executorRole || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>BPMN Схема</CardTitle></CardHeader>
        <CardContent>
          {process.bpmnUrl ? (
            <a href={process.bpmnUrl} target="_blank" rel="noreferrer" className="text-[#fa4616] hover:underline font-medium">
              🔗 Відкрити схему за посиланням
            </a>
          ) : (
            <span className="text-muted-foreground text-sm">Посилання на схему ще не додано</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Показники KPI</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Назва</TableHead>
                <TableHead>Одиниця виміру</TableHead>
                <TableHead>Джерело</TableHead>
                <TableHead>Цільове значення</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(process.kpis || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    Показники KPI ще не додані
                  </TableCell>
                </TableRow>
              ) : (
                process.kpis.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium">{kpi.name}</TableCell>
                    <TableCell>{kpi.unit || '-'}</TableCell>
                    <TableCell>{kpi.dataSource || '-'}</TableCell>
                    <TableCell>{kpi.targetValue || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Історія дій</CardTitle></CardHeader>
        <CardContent>
          {(process.historyLogs || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Історія порожня</p>
          ) : (
            <ul className="space-y-3">
              {process.historyLogs.map((log) => (
                <li key={log.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.user?.fullName || 'Система'}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString('uk-UA')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Дія: <span className="font-semibold text-slate-800">{log.action}</span>
                    {log.comment && <span className="italic ml-2">«{log.comment}»</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
