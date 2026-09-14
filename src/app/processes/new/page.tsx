'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function NewProcessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          objective,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        // Якщо передана мета — збережемо її в паспорт
        if (objective) {
          await fetch(`/api/processes/${result.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objective }),
          });
        }
        router.push(`/processes/${result.id}/edit`);
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка при створенні процесу');
      }
    } catch (error) {
      alert('Сталася мережева помилка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="border border-slate-200 shadow-md">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#fa4616] font-semibold text-sm mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Крок 1: Ініціація процесу</span>
          </div>
          <CardTitle className="text-2xl text-slate-800">Створити новий процес</CardTitle>
          <CardDescription>
            Вкажіть базову назву та мету процесу. Детальні кроки та метрики заповнюються на наступних етапах, а код і тип процесу призначає процесний аналітик після затвердження.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                Назва процесу <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Наприклад: Процес адаптації нового співробітника"
                className="h-11 focus-visible:ring-[#fa4616]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective" className="text-sm font-medium text-slate-700">
                Попередня мета процесу
              </Label>
              <Textarea
                id="objective"
                name="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Опишіть, чого має досягти цей процес і яку цінність він створює..."
                rows={4}
                className="focus-visible:ring-[#fa4616]"
              />
            </div>

            <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200/60 text-xs text-amber-800 leading-relaxed">
              💡 <strong>Як це працює:</strong> Після створення ви перейдете до заповнення <strong>Паспорта процесу</strong>. Коли ви його заповните і подасте — аналітик або власник погодить його, і вам відкриється доступ до опису <strong>Кроків (AS-IS)</strong>, а згодом — до <strong>Показників (KPI)</strong>.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Скасувати
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                className="bg-[#fa4616] hover:bg-[#d93a10] text-white font-medium gap-2"
              >
                {loading ? 'Створення...' : (
                  <>
                    <span>Перейти до Паспорта</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
