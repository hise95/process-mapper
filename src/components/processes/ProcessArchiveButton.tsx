'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Archive, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';

interface ProcessArchiveButtonProps {
  processId: string;
  processTitle: string;
  processCode?: string | null;
  status: string;
  isAnalyst: boolean;
}

export function ProcessArchiveButton({
  processId,
  processTitle,
  processCode,
  status,
  isAnalyst,
}: ProcessArchiveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAnalyst) return null;

  const isArchived = status === 'ARCHIVED';

  const handleAction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/processes/${processId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isArchived ? 'RESTORE' : 'ARCHIVE' }),
      });

      if (res.ok) {
        setOpen(false);
        if (isArchived) {
          router.refresh();
        } else {
          // Якщо відправили в архів — перенаправляємо до репозиторію
          router.push('/repository');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Помилка при виконанні дії');
      }
    } catch (err) {
      console.error(err);
      alert('Сталася мережева помилка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isArchived ? (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Відновити з архіву</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5 font-medium"
        >
          <Archive className="w-4 h-4" />
          <span>В архів</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              isArchived ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
            }`}>
              {isArchived ? <RotateCcw className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <DialogTitle>
              {isArchived ? 'Відновити процес з архіву?' : 'Перемістити процес в архів?'}
            </DialogTitle>
            <DialogDescription className="text-left pt-1">
              {isArchived ? (
                <span>
                  Процес <strong>«{processTitle}»</strong> ({processCode || 'без коду'}) повернеться до Репозиторію компанії в статусі <strong>Затверджено</strong>.
                </span>
              ) : (
                <span>
                  Процес <strong>«{processTitle}»</strong> ({processCode || 'без коду'}) перейде в статус <strong>В архіві</strong> і зникне зі списку Репозиторію. Ви зможете відновити його будь-коли у вкладці <strong>«Архів»</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Скасувати
            </Button>
            <Button
              variant={isArchived ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={loading}
              className={isArchived ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5' : 'gap-1.5 font-medium'}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isArchived ? (
                <RotateCcw className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              <span>
                {loading ? 'Збереження...' : isArchived ? 'Так, відновити' : 'Так, перемістити в архів'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
