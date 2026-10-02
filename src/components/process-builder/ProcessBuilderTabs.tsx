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
  Send,
  Sparkles,
  ListChecks,
  Share2,
  Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getStatusLabel, PROCESS_STATUS_LABELS } from '@/lib/enums';

export default function ProcessBuilderTabs({ 
  process,
  canEditPassport,
  canEditSteps,
  canEditKpis
}: { 
  process: ProcessForEdit,
  canEditPassport: boolean,
  canEditSteps: boolean,
  canEditKpis: boolean
}) {
  const [activeTab, setActiveTab] = useState<string>('passport');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Логіка розблокування вкладок на основі 3-фазного статусу:
  // Фаза 1: Паспорт (DRAFT, PASSPORT_REVIEW_ANALYST, PASSPORT_REVIEW_OWNER)
  // Фаза 2: Кроки (STEPS_DRAFT, STEPS_REVIEW_ANALYST, STEPS_REVIEW_OWNER)
  // Фаза 3: Показники (KPIS_DRAFT, KPIS_REVIEW_ANALYST, KPIS_REVIEW_OWNER, FINAL_APPROVAL_ANALYST)
  // Завершено: APPROVED

  const isStepsUnlocked = ![
    'DRAFT', 
    'PASSPORT_REVIEW_ANALYST', 
    'PASSPORT_REVIEW_OWNER'
  ].includes(process.status);

  const isKpisUnlocked = ![
    'DRAFT',
    'PASSPORT_REVIEW_ANALYST',
    'PASSPORT_REVIEW_OWNER',
    'STEPS_DRAFT',
    'STEPS_REVIEW_ANALYST',
    'STEPS_REVIEW_OWNER'
  ].includes(process.status);

  const handleSubmitStage = async (transition: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/processes/${process.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transition,
          comment: `Відправлено на перевірку`
        }),
      });

      if (!res.ok) {
        alert('Помилка при відправці процесу');
      } else {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert('Помилка');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start h-full pb-10">
      <div className="w-full lg:flex-1 space-y-6">
        
        {/* Панель стану та дій */}
        <div className="flex flex-wrap justify-between items-center bg-card p-4 rounded-xl border border-border mb-6 gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Badge className={`${PROCESS_STATUS_LABELS[process.status]?.className || 'bg-muted text-foreground'} px-3 py-1 font-semibold text-xs border-none shadow-xs`}>
              Статус: {getStatusLabel(process.status)}
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
                onClick={() => handleSubmitStage('SUBMIT_PASSPORT_ANALYST')} 
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Відправка...' : 'Подати паспорт на перевірку'}</span>
              </Button>
            )}

            {activeTab === 'steps' && process.status === 'STEPS_DRAFT' && (
              <Button 
                onClick={() => handleSubmitStage('SUBMIT_STEPS_ANALYST')} 
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Відправка...' : 'Подати кроки на перевірку'}</span>
              </Button>
            )}

            {activeTab === 'kpis' && process.status === 'KPIS_DRAFT' && (
              <Button 
                onClick={() => handleSubmitStage('SUBMIT_KPIS_ANALYST')} 
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Відправка...' : 'Подати показники на перевірку'}</span>
              </Button>
            )}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted border border-border p-1 rounded-xl mb-6 flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 w-full !h-auto gap-1">
            <TabsTrigger 
              value="passport" 
              className="py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs h-full"
            >
              <FileText className="w-4 h-4" />
              <span>1. Паспорт</span>
            </TabsTrigger>

            <TabsTrigger 
              value="steps" 
              disabled={!isStepsUnlocked}
              className="py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs disabled:opacity-40 h-full"
            >
              <ListChecks className="w-4 h-4" />
              <span>2. Кроки AS-IS</span>
              {!isStepsUnlocked && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
            </TabsTrigger>

            <TabsTrigger 
              value="bpmn" 
              disabled={!isStepsUnlocked}
              className="py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs disabled:opacity-40 h-full"
            >
              <Share2 className="w-4 h-4" />
              <span>3. BPMN Схема</span>
              {!isStepsUnlocked && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
            </TabsTrigger>

            <TabsTrigger 
              value="kpis" 
              disabled={!isKpisUnlocked}
              className="py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs disabled:opacity-40 h-full"
            >
              <Activity className="w-4 h-4" />
              <span>4. Показники</span>
              {!isKpisUnlocked && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="passport" className="mt-0">
            <PassportTab process={process} readonly={!canEditPassport} />
          </TabsContent>

          <TabsContent value="steps" className="mt-0">
            <StepsTab processId={process.id} initialSteps={process.steps || []} readonly={!canEditSteps} />
          </TabsContent>

          <TabsContent value="bpmn" className="mt-0">
            <BpmnTab processId={process.id} initialUrl={process.bpmnUrl || ''} readonly={!canEditSteps} />
          </TabsContent>

          <TabsContent value="kpis" className="mt-0">
            <KpisTab processId={process.id} initialKpis={process.kpis || []} readonly={!canEditKpis} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Інформаційна панель */}
      <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4">
        <div className="p-5 border border-border rounded-xl bg-card shadow-xs space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Життєвий цикл</span>
          </h3>
          
          <div className="space-y-3 text-xs leading-relaxed">
            <div className={`p-3.5 rounded-xl border transition-all ${
              !isStepsUnlocked 
                ? 'bg-amber-500/10 border-amber-500/30 text-foreground' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-foreground">Фаза 1: Паспорт</p>
                {!isStepsUnlocked ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-none font-semibold">
                    В роботі
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none font-semibold">
                    Завершено
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground break-normal hyphens-none">
                Менеджер заповнює базову інформацію, аналітик та власник погоджують.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all ${
              isStepsUnlocked && !isKpisUnlocked 
                ? 'bg-amber-500/10 border-amber-500/30 text-foreground' 
                : isKpisUnlocked 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' 
                : 'bg-muted/40 border-border text-muted-foreground'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-foreground">Фаза 2: Кроки та BPMN</p>
                {isStepsUnlocked && !isKpisUnlocked ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-none font-semibold">
                    В роботі
                  </Badge>
                ) : isKpisUnlocked ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none font-semibold">
                    Завершено
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-normal">
                    Заблоковано
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground break-normal hyphens-none">
                Деталізація кроків процесу та додавання посилання на схему BPMN.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all ${
              isKpisUnlocked && process.status !== 'APPROVED' 
                ? 'bg-amber-500/10 border-amber-500/30 text-foreground' 
                : process.status === 'APPROVED' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground' 
                : 'bg-muted/40 border-border text-muted-foreground'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-foreground">Фаза 3: Показники</p>
                {isKpisUnlocked && process.status !== 'APPROVED' ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-none font-semibold">
                    В роботі
                  </Badge>
                ) : process.status === 'APPROVED' ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none font-semibold">
                    Затверджено
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-normal">
                    Заблоковано
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground break-normal hyphens-none">
                Додавання показників результативності та фінальне затвердження.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
