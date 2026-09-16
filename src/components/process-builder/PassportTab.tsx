'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info, CheckCircle2, Loader2 } from 'lucide-react';
import type { ProcessForEdit } from '@/lib/types';
import { PROCESS_TYPE_LABELS } from '@/lib/enums';

export default function PassportTab({ process }: { process: ProcessForEdit }) {
  const [data, setData] = useState(process);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (field: string, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    setLastSaved(false);
    setSavingField(field);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
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
        setSavingField(null);
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Інформаційна плашка про автозбереження */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-slate-100/80 px-4 py-2.5 rounded-md border border-slate-200">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Зміни в полях зберігаються автоматично після завершення введення.</span>
        </div>
        <div>
          {savingField ? (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Збереження...
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Збережено
            </span>
          ) : null}
        </div>
      </div>

      {/* Основні дані паспорта */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-slate-800">1. Загальна інформація про процес</CardTitle>
          <CardDescription>Базові параметри та цілі функціонування процесу</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">
              Назва процесу <span className="text-red-500">*</span>
            </Label>
            <Input
              value={data.title || ''}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="Введіть назву процесу"
              className="font-medium text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">Мета процесу</Label>
            <Textarea
              value={data.objective || ''}
              onChange={e => handleChange('objective', e.target.value)}
              placeholder="Чого має досягти цей бізнес-процес, для чого він існує?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">Учасники процесу</Label>
            <Textarea
              value={data.participants || ''}
              onChange={e => handleChange('participants', e.target.value)}
              placeholder="Які підрозділи, посади чи ролі задіяні у виконанні процесу?"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Межі процесу: Входи та Постачальники */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-slate-800">2. Входи процесу та Попередники</CardTitle>
          <CardDescription>Що потрібно для старту процесу і звідки це надходить</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Вхід (матеріали, інформація, документи)</Label>
              <Textarea
                value={data.input || ''}
                onChange={e => handleChange('input', e.target.value)}
                placeholder="Що запускає процес (заявка, дзвінок, звіт, сировина тощо)?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Постачальник входу</Label>
              <Textarea
                value={data.inputSupplier || ''}
                onChange={e => handleChange('inputSupplier', e.target.value)}
                placeholder="Хто передає цей вхід (клієнт, суміжний відділ, постачальник)?"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">Який бізнес-процес іде перед ним</Label>
            <Input
              value={data.upstreamProcesses || ''}
              onChange={e => handleChange('upstreamProcesses', e.target.value)}
              placeholder="Попередній процес (якщо є зв'язок)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Межі процесу: Виходи та Клієнти */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-slate-800">3. Результати процесу (Виходи) та Клієнти</CardTitle>
          <CardDescription>Що є фінальним продуктом процесу і хто його споживає</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Вихід (результат роботи)</Label>
              <Textarea
                value={data.output || ''}
                onChange={e => handleChange('output', e.target.value)}
                placeholder="Готовий результат (підписаний договір, надана послуга, відправлений товар)?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Клієнти процесу (споживачі)</Label>
              <Textarea
                value={data.clients || ''}
                onChange={e => handleChange('clients', e.target.value)}
                placeholder="Внутрішні клієнти (відділи компанії) та зовнішні (покупці, партнери)..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-slate-700">Який бізнес-процес іде після нього</Label>
            <Input
              value={data.downstreamProcesses || ''}
              onChange={e => handleChange('downstreamProcesses', e.target.value)}
              placeholder="Наступний процес, якому передається результат"
            />
          </div>
        </CardContent>
      </Card>

      {/* Блок класифікації аналітиком (інформаційний для менеджера) */}
      <div className="p-4 rounded-lg bg-slate-100/90 border border-dashed border-slate-300">
        <div className="flex items-start gap-3">
          <span className="p-1.5 rounded-full bg-slate-200 text-slate-700">
            <Info className="w-4 h-4" />
          </span>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-800">Службова класифікація (Код, Тип, Рівень L1-L3)</p>
            <p className="text-slate-600 leading-relaxed">
              Код процесу ({data.code || 'ще не присвоєно'}), офіційний тип процесу ({data.processType ? (PROCESS_TYPE_LABELS[data.processType] || data.processType) : 'не призначено'}) та рівень в ієрархії компанії будуть заповнені <strong>Процесним аналітиком</strong> на фінальному етапі після успішного погодження паспорта, кроків і показників.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
