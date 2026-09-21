'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, CheckCircle2, Loader2, User, FileText, ArrowRightLeft, Target } from 'lucide-react';
import type { ProcessForEdit } from '@/lib/types';
import { PROCESS_TYPE_LABELS } from '@/lib/enums';

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export default function PassportTab({ process }: { process: ProcessForEdit }) {
  const [data, setData] = useState(process);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<boolean>(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.ok ? res.json() : [])
      .then(list => setUsers(list))
      .catch(err => console.error('Failed to load users list', err));
  }, []);

  const handleChange = (field: string, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    setLastSaved(false);
    setSavingField(field);

    if (saveTimersRef.current[field]) clearTimeout(saveTimersRef.current[field]);
    saveTimersRef.current[field] = setTimeout(async () => {
      try {
        await fetch(`/api/processes/${process.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        });
        setLastSaved(true);
      } catch (err) {
        console.error('Error saving field', field, err);
      } finally {
        setSavingField(prev => (prev === field ? null : prev));
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Інформаційна плашка про автозбереження */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-4 py-3 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>Зміни в полях зберігаються автоматично після завершення введення.</span>
        </div>
        <div>
          {savingField ? (
            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Збереження...
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Збережено
            </span>
          ) : null}
        </div>
      </div>

      {/* 1. Загальна інформація про процес */}
      <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
            <span>Загальна інформація про процес</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Базові параметри, відповідальні особи та цілі функціонування процесу</p>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold text-foreground text-sm">
              Назва процесу <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="Введіть назву процесу"
              className="h-10 font-medium text-foreground focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <Label className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>Менеджер процесу</span>
              </Label>
              <Select
                value={data.managerId || 'none'}
                onValueChange={val => handleChange('managerId', !val || val === 'none' ? '' : val)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Не призначено" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не призначено</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-secondary" />
                <span>Власник процесу</span>
              </Label>
              <Select
                value={data.ownerId || 'none'}
                onValueChange={val => handleChange('ownerId', !val || val === 'none' ? '' : val)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Не призначено" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не призначено</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Label className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span>Мета процесу</span>
            </Label>
            <Textarea
              value={data.objective || ''}
              onChange={e => handleChange('objective', e.target.value)}
              placeholder="Чого має досягти цей бізнес-процес, для чого він існує?"
              rows={3}
              className="text-foreground focus-visible:ring-primary leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-foreground text-sm">Учасники процесу</Label>
            <Textarea
              value={data.participants || ''}
              onChange={e => handleChange('participants', e.target.value)}
              placeholder="Які підрозділи, посади чи ролі задіяні у виконанні процесу?"
              rows={2}
              className="text-foreground focus-visible:ring-primary leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 2. Межі процесу: Входи та Попередники */}
      <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
            <span>Входи процесу та Попередники</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Що потрібно для старту процесу і звідки це надходить</p>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-foreground text-sm">Вхід (матеріали, інформація, документи)</Label>
              <Textarea
                value={data.input || ''}
                onChange={e => handleChange('input', e.target.value)}
                placeholder="Що запускає процес (заявка, дзвінок, звіт, сировина тощо)?"
                rows={3}
                className="text-foreground focus-visible:ring-primary leading-relaxed"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-foreground text-sm">Постачальник входу</Label>
              <Textarea
                value={data.inputSupplier || ''}
                onChange={e => handleChange('inputSupplier', e.target.value)}
                placeholder="Хто передає цей вхід (клієнт, суміжний відділ, постачальник)?"
                rows={3}
                className="text-foreground focus-visible:ring-primary leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-foreground text-sm">Який бізнес-процес іде перед ним (Upstream)</Label>
            <Input
              value={data.upstreamProcesses || ''}
              onChange={e => handleChange('upstreamProcesses', e.target.value)}
              placeholder="Попередній процес (якщо є зв'язок)"
              className="h-10 text-foreground focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* 3. Межі процесу: Виходи та Клієнти */}
      <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
            <span>Результати процесу (Виходи) та Клієнти</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Що є фінальним продуктом процесу і хто його споживає</p>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-foreground text-sm">Вихід (результат роботи)</Label>
              <Textarea
                value={data.output || ''}
                onChange={e => handleChange('output', e.target.value)}
                placeholder="Готовий результат (підписаний договір, надана послуга, відправлений товар)?"
                rows={3}
                className="text-foreground focus-visible:ring-primary leading-relaxed"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-foreground text-sm">Клієнти процесу (споживачі)</Label>
              <Textarea
                value={data.clients || ''}
                onChange={e => handleChange('clients', e.target.value)}
                placeholder="Внутрішні клієнти (відділи компанії) та зовнішні (покупці, партнери)..."
                rows={3}
                className="text-foreground focus-visible:ring-primary leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-foreground text-sm">Який бізнес-процес іде після нього (Downstream)</Label>
            <Input
              value={data.downstreamProcesses || ''}
              onChange={e => handleChange('downstreamProcesses', e.target.value)}
              placeholder="Наступний процес, якому передається результат"
              className="h-10 text-foreground focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Блок класифікації аналітиком */}
      <div className="p-4 rounded-xl bg-muted/40 border border-dashed border-border">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </span>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-foreground">Службова класифікація (Код, Тип, Рівень L1-L3)</p>
            <p className="text-muted-foreground leading-relaxed">
              Код процесу (<span className="font-mono font-medium text-foreground">{data.code || 'ще не присвоєно'}</span>), офіційний тип процесу (<span className="font-medium text-foreground">{data.processType ? (PROCESS_TYPE_LABELS[data.processType] || data.processType) : 'не призначено'}</span>) та рівень в ієрархії компанії призначаються <strong>Процесним аналітиком</strong> на фінальному етапі після успішного погодження паспорта, кроків і показників.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
