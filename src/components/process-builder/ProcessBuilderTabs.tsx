'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PassportTab from './PassportTab';
import StepsTab from './StepsTab';
import BpmnTab from './BpmnTab';
import KpisTab from './KpisTab';
import type { ProcessForEdit } from '@/lib/types';
import {
  FileText,
  GitCommit,
  BarChart3,
  Layers,
  Lock,
  CheckCircle2,
  Send,
  Sparkles
} from 'lucide-react';

export default function ProcessBuilderTabs({ process }: { process: ProcessForEdit }) {
  const [activeTab, setActiveTab] = useState<string>('passport');
  const [submitting, setSubmitting] = useState(false);

  // Визначаємо поточну стадію на основі статусу процесу та наявності даних
  // Для гнучкості: якщо статус DRAFT і немає кроків — це етап 1 (Паспорт)
  // Якщо статус DRAFT або IN_REVIEW_ANALYST, але кроки вже дозволені / заповнені — це наступні етапи
  const hasSteps = (process.steps && process.steps.length > 0);
  const hasKpis = (process.kpis && process.kpis.length > 0);
  const isApproved = process.status === 'APPROVED';

  // Логіка розблокування етапів:
  // Етап 1 (Паспорт) — відкритий завжди.
  // Етап 2 (Кроки) — відкритий, якщо паспорт вже погоджувався або якщо процес вже має кроки / перейшов перший етап.
  // Для комфортної демонстрації та роботи: якщо менеджер уже подавав або погодив паспорт, відкриваємо кроки.
  const isStepsUnlocked = process.status !== 'DRAFT' || hasSteps || process.historyLogs?.length > 1;
  const isKpisUnlocked = isStepsUnlocked && (hasSteps || process.historyLogs?.length > 2);
  const isAnalystFinalStage = isApproved || (hasSteps && hasKpis);

  const handleSubmitStage = async (stageName: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/processes/${process.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transition: 'SUBMIT_FOR_ANALYST',
          comment: `Подано на перевірку етап: ${stageName}`
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Помилка при подачі на погодження');
      }
    } catch (err) {
      alert('Помилка з\'єднання');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Степпер прогресу життєвого циклу ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          {/* Крок 1 */}
          <div className="flex items-center gap-3 min-w-fit">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              isStepsUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-[#fa4616] text-white'
            }`}>
              {isStepsUnlocked ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Крок 1 (Менеджер)</p>
              <p className="text-sm font-semibold text-slate-800">Паспорт процесу</p>
            </div>
          </div>

          <div className="w-12 h-0.5 bg-slate-200 shrink-0" />

          {/* Крок 2 */}
          <div className="flex items-center gap-3 min-w-fit">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              !isStepsUnlocked 
                ? 'bg-slate-100 text-slate-400' 
                : isKpisUnlocked 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-[#fa4616] text-white'
            }`}>
              {!isStepsUnlocked ? <Lock className="w-4 h-4" /> : isKpisUnlocked ? <CheckCircle2 className="w-5 h-5" /> : '2'}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Крок 2 (Менеджер)</p>
              <p className="text-sm font-semibold text-slate-800">Кроки AS-IS та BPMN</p>
            </div>
          </div>

          <div className="w-12 h-0.5 bg-slate-200 shrink-0" />

          {/* Крок 3 */}
          <div className="flex items-center gap-3 min-w-fit">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              !isKpisUnlocked 
                ? 'bg-slate-100 text-slate-400' 
                : isApproved 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-[#fa4616] text-white'
            }`}>
              {!isKpisUnlocked ? <Lock className="w-4 h-4" /> : isApproved ? <CheckCircle2 className="w-5 h-5" /> : '3'}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Крок 3 (Менеджер)</p>
              <p className="text-sm font-semibold text-slate-800">Показники KPI</p>
            </div>
          </div>

          <div className="w-12 h-0.5 bg-slate-200 shrink-0" />

          {/* Крок 4 */}
          <div className="flex items-center gap-3 min-w-fit">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              isApproved ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {isApproved ? <CheckCircle2 className="w-5 h-5" /> : '4'}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Фінал (Аналітик)</p>
              <p className="text-sm font-semibold text-slate-800">Класифікація & Репозиторій</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Основна робоча область ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          {/* Панель дій вгорі */}
          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border border-slate-200 mb-6 gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1 font-semibold text-slate-700">
                Статус: {process.status}
              </Badge>
              {process.code && (
                <Badge className="bg-[#ffd100] text-slate-900 font-bold border-none">
                  Код: {process.code}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'passport' && process.status === 'DRAFT' && (
                <Button 
                  onClick={() => handleSubmitStage('Паспорт процесу')} 
                  disabled={submitting}
                  className="bg-[#fa4616] hover:bg-[#d93a10] text-white font-medium gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Відправка...' : 'Подати паспорт на погодження'}</span>
                </Button>
              )}

              {activeTab === 'steps' && isStepsUnlocked && (
                <Button 
                  onClick={() => handleSubmitStage('Кроки AS-IS')} 
                  disabled={submitting}
                  className="bg-[#fa4616] hover:bg-[#d93a10] text-white font-medium gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Відправка...' : 'Подати опис кроків на погодження'}</span>
                </Button>
              )}

              {activeTab === 'kpis' && isKpisUnlocked && (
                <Button 
                  onClick={() => handleSubmitStage('Показники KPI')} 
                  disabled={submitting}
                  className="bg-[#fa4616] hover:bg-[#d93a10] text-white font-medium gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Відправка...' : 'Подати показники на класифікацію'}</span>
                </Button>
              )}
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent mb-6 gap-2">
              <TabsTrigger 
                value="passport"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#fa4616] data-[state=active]:text-[#fa4616] rounded-none px-4 py-3 font-semibold gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>1. Паспорт процесу</span>
              </TabsTrigger>

              <TabsTrigger 
                value="steps"
                disabled={!isStepsUnlocked}
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#fa4616] data-[state=active]:text-[#fa4616] rounded-none px-4 py-3 font-semibold gap-2 disabled:opacity-50"
              >
                {!isStepsUnlocked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <GitCommit className="w-4 h-4" />}
                <span>2. Кроки AS-IS</span>
              </TabsTrigger>

              <TabsTrigger 
                value="bpmn"
                disabled={!isStepsUnlocked}
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#fa4616] data-[state=active]:text-[#fa4616] rounded-none px-4 py-3 font-semibold gap-2 disabled:opacity-50"
              >
                {!isStepsUnlocked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Layers className="w-4 h-4" />}
                <span>BPMN схема</span>
              </TabsTrigger>

              <TabsTrigger 
                value="kpis"
                disabled={!isKpisUnlocked}
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#fa4616] data-[state=active]:text-[#fa4616] rounded-none px-4 py-3 font-semibold gap-2 disabled:opacity-50"
              >
                {!isKpisUnlocked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <BarChart3 className="w-4 h-4" />}
                <span>3. Показники KPI</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="passport" className="mt-0">
              <PassportTab process={process} />
            </TabsContent>

            <TabsContent value="steps" className="mt-0">
              <StepsTab processId={process.id} initialSteps={process.steps || []} />
            </TabsContent>

            <TabsContent value="bpmn" className="mt-0">
              <BpmnTab processId={process.id} initialUrl={process.bpmnUrl || ''} />
            </TabsContent>

            <TabsContent value="kpis" className="mt-0">
              <KpisTab processId={process.id} initialKpis={process.kpis || []} />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* ── Бічна панель чек-листа та підказок ── */}
        <aside className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#fa4616]" />
              <span>Порядок заповнення</span>
            </h3>
            
            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="font-semibold text-slate-800 mb-1">1. Заповнення паспорта</p>
                <p>Менеджер вносить цілі, входи, виходи та межі процесу. Після завершення натисніть кнопку відправки на погодження.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="font-semibold text-slate-800 mb-1">2. Опис кроків AS-IS</p>
                <p>Після погодження паспорта відкривається таблиця кроків та поле для посилання на BPMN-схему в Camunda / Google Drive.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="font-semibold text-slate-800 mb-1">3. Визначення KPI</p>
                <p>Після затвердження кроків вказуються метрики вимірювання успішності та ефективності процесу.</p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-900">
                <p className="font-semibold mb-1">4. Фінал (Процесний аналітик)</p>
                <p>Аналітик призначає код, рівень (L1-L3), тип процесу і фінально публікує його в Репозиторій.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
