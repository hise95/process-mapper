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
import { getStatusLabel } from '@/lib/enums';

export default function ProcessBuilderTabs({ process }: { process: ProcessForEdit }) {
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
            <Badge variant="outline" className="px-3 py-1 font-semibold text-foreground">
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
          <TabsList className="bg-muted border border-border p-1 rounded-xl mb-6 grid grid-cols-4 w-full h-auto">
            <TabsTrigger 
              value="passport" 
              className="py-2.5 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>1. Паспорт</span>
            </TabsTrigger>

            <TabsTrigger 
              value="steps" 
              disabled={!isStepsUnlocked}
              className="py-2.5 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs disabled:opacity-40"
            >
              <ListChecks className="w-4 h-4" />
              <span>2. Кроки AS-IS</span>
              {!isStepsUnlocked && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
            </TabsTrigger>

            <TabsTrigger 
              value="bpmn" 
              disabled={!isStepsUnlocked}
              className="py-2.5 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs disabled:opacity-40"
            >
              <Share2 className="w-4 h-4" />
              <span>3. BPMN Схема</span>
              {!isStepsUnlocked && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
            </TabsTrigger>

            <TabsTrigger 
              value="kpis" 
              disabled={!isKpisUnlocked}
              className="py-2.5 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs disabled:opacity-40"
            >
              <Activity className="w-4 h-4" />
              <span>4. Показники</span>
              {!isKpisUnlocked && <Lock className="w-3 h-3 ml-0.5 text-muted-foreground" />}
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
      
      {/* Інформаційна панель */}
      <aside className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="p-5 border border-border rounded-xl bg-card shadow-sm space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Життєвий цикл</span>
          </h3>
          
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <div className={`p-3 rounded-lg border ${!isStepsUnlocked ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200' : 'bg-green-500/10 border-green-500/20 text-green-900 dark:text-green-200'}`}>
              <p className="font-semibold text-foreground mb-1">Фаза 1: Паспорт</p>
              <p>Менеджер заповнює базову інформацію, аналітик та власник погоджують.</p>
            </div>

            <div className={`p-3 rounded-lg border ${isStepsUnlocked && !isKpisUnlocked ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200' : isKpisUnlocked ? 'bg-green-500/10 border-green-500/20 text-green-900 dark:text-green-200' : 'bg-muted/40 border-border'}`}>
              <p className="font-semibold text-foreground mb-1">Фаза 2: Кроки та BPMN</p>
              <p>Деталізація процесу (кроки) та додавання посилання на схему BPMN.</p>
            </div>

            <div className={`p-3 rounded-lg border ${isKpisUnlocked && process.status !== 'APPROVED' ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200' : process.status === 'APPROVED' ? 'bg-green-500/10 border-green-500/20 text-green-900 dark:text-green-200' : 'bg-muted/40 border-border'}`}>
              <p className="font-semibold text-foreground mb-1">Фаза 3: Показники процесу</p>
              <p>Додавання показників результативності та фінальне затвердження.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
