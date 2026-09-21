'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Archive, 
  RotateCcw, 
  ExternalLink, 
  Search, 
  Loader2, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PROCESS_TYPE_LABELS } from '@/lib/enums';

interface ArchivedProcess {
  id: string;
  title: string;
  code: string | null;
  version: number;
  processType: string;
  updatedAt: string;
  manager?: { fullName: string };
  owner?: { fullName: string };
}

export function ArchiveView() {
  const [processes, setProcesses] = useState<ArchivedProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restoreProcess, setRestoreProcess] = useState<ArchivedProcess | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/processes?status=ARCHIVED');
      if (res.ok) {
        const data = await res.json();
        setProcesses(data);
      }
    } catch (err) {
      console.error('Failed to load archive', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const handleConfirmRestore = async () => {
    if (!restoreProcess) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/processes/${restoreProcess.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESTORE' }),
      });
      if (res.ok) {
        setProcesses(prev => prev.filter(p => p.id !== restoreProcess.id));
        setRestoreProcess(null);
      } else {
        alert('Помилка при відновленні процесу');
      }
    } catch (err) {
      console.error(err);
      alert('Сталася мережева помилка');
    } finally {
      setRestoring(false);
    }
  };

  const filtered = processes.filter(p => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.owner?.fullName && p.owner.fullName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Пошук та лічильник */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук в архіві за назвою, кодом..."
            className="pl-9 h-10 focus-visible:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Всього в архіві:</span>
          <Badge variant="secondary" className="font-bold">
            {processes.length}
          </Badge>
        </div>
      </div>

      {/* Таблиця архіву */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-sm">Завантаження архіву...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">
              {search ? 'Нічого не знайдено за вашим запитом' : 'Архів порожній'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search 
                ? 'Спробуйте змінити пошуковий запит' 
                : 'Тут зберігатимуться процеси, переміщені в архів з репозиторію. Їх можна буде переглянути або відновити в будь-який момент.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-24">Код</TableHead>
                <TableHead>Назва процесу</TableHead>
                <TableHead className="w-32">Тип</TableHead>
                <TableHead>Власник</TableHead>
                <TableHead className="w-28">Версія</TableHead>
                <TableHead className="w-44 text-left">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(process => (
                <TableRow key={process.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-bold text-xs text-muted-foreground">
                    {process.code || '—'}
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/processes/${process.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{process.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {PROCESS_TYPE_LABELS[process.processType] || process.processType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {process.owner?.fullName || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      v{process.version || '1.0'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-44 text-left">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreProcess(process)}
                        className="h-8 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30 gap-1 font-medium"
                        title="Відновити процес з архіву"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Відновити</span>
                      </Button>
                      <Link
                        href={`/processes/${process.id}`}
                        className="inline-flex items-center justify-center h-8 px-2 text-xs rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Відкрити картку"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Діалог підтвердження відновлення */}
      <Dialog open={!!restoreProcess} onOpenChange={open => !open && setRestoreProcess(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <RotateCcw className="w-5 h-5" />
            </div>
            <DialogTitle>Відновити процес з архіву?</DialogTitle>
            <DialogDescription className="space-y-2 pt-1 text-left">
              <span>
                Процес <strong>«{restoreProcess?.title}»</strong> ({restoreProcess?.code || 'без коду'}) повернеться до активного репозиторію компанії в статусі <strong>Затверджено</strong>.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRestoreProcess(null)}
              disabled={restoring}
            >
              Скасувати
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={restoring}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{restoring ? 'Відновлення...' : 'Так, відновити'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
