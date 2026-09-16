"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ExternalLink, UserCheck, ShieldCheck } from "lucide-react"

const STATUS_LABELS_UA: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Чернетка (Паспорт)", className: "bg-slate-500 text-white" },
  PASSPORT_REVIEW_ANALYST: { label: "Паспорт: Перевірка А.", className: "bg-amber-500 text-white" },
  PASSPORT_REVIEW_OWNER: { label: "Паспорт: Погодження В.", className: "bg-orange-500 text-white" },
  STEPS_DRAFT: { label: "Чернетка (Кроки)", className: "bg-slate-500 text-white" },
  STEPS_REVIEW_ANALYST: { label: "Кроки: Перевірка А.", className: "bg-amber-500 text-white" },
  STEPS_REVIEW_OWNER: { label: "Кроки: Погодження В.", className: "bg-orange-500 text-white" },
  KPIS_DRAFT: { label: "Чернетка (Показники)", className: "bg-slate-500 text-white" },
  KPIS_REVIEW_ANALYST: { label: "Показники: Перевірка А.", className: "bg-amber-500 text-white" },
  KPIS_REVIEW_OWNER: { label: "Показники: Погодження В.", className: "bg-orange-500 text-white" },
  FINAL_APPROVAL_ANALYST: { label: "Фінальне затвердження", className: "bg-blue-600 text-white" },
  APPROVED: { label: "Затверджено", className: "bg-emerald-600 text-white" },
  ARCHIVED: { label: "В архіві", className: "bg-slate-400 text-white" },
};

import { PROCESS_TYPE_LABELS } from "@/lib/enums"

export function ProcessReadOnlyCard({ process }: { process: any }) {
  if (!process) return null;

  const statusMeta = STATUS_LABELS_UA[process.status] || { label: process.status, className: "bg-[#fa4616] text-white" };
  const typeLabel = process.processType ? (PROCESS_TYPE_LABELS[process.processType] || process.processType) : "Тип не вказано";

  return (
    <Card className="h-full flex flex-col overflow-hidden relative border border-border shadow-sm bg-card">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-3 flex items-center justify-between shadow-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono shrink-0 bg-muted text-foreground">
            {process.code || "БЕЗ КОДУ"}
          </Badge>
          <h2 className="text-sm sm:text-base font-bold truncate text-foreground">{process.title}</h2>
          <Badge variant="outline" className="text-[11px] shrink-0">v{process.version || "1.0"}</Badge>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs text-muted-foreground whitespace-nowrap">{typeLabel}</Badge>
          <Badge className={`${statusMeta.className} border-none text-xs font-semibold whitespace-nowrap shadow-xs`}>
            {statusMeta.label}
          </Badge>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.open(`/processes/${process.id}`, '_blank')}
            className="text-xs h-7 px-2 text-primary hover:bg-primary/10 font-medium gap-1"
            title="Відкрити процес на окремій сторінці"
          >
            <span>Відкрити</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Паспорт процесу */}
          <section className="space-y-3">
            <h3 className="text-base font-bold border-b border-border pb-2 text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Паспорт процесу
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Менеджер процесу</span>
                <span className="font-medium text-foreground">{process.manager?.fullName || "—"}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Власник процесу</span>
                <span className="font-medium text-foreground">{process.owner?.fullName || "—"}</span>
              </div>

              <div className="md:col-span-2 p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Мета процесу</span>
                <p className="whitespace-pre-wrap text-foreground/90">{process.objective || "—"}</p>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Вхід (що запускає процес)</span>
                <p className="whitespace-pre-wrap text-foreground/90">{process.input || "—"}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Вихід (результат роботи)</span>
                <p className="whitespace-pre-wrap text-foreground/90">{process.output || "—"}</p>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Постачальник входу</span>
                <p className="text-foreground/90">{process.inputSupplier || "—"}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Клієнти процесу</span>
                <p className="whitespace-pre-wrap text-foreground/90">{process.clients || "—"}</p>
              </div>

              <div className="md:col-span-2 p-3 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Учасники процесу</span>
                <p className="whitespace-pre-wrap text-foreground/90">{process.participants || "—"}</p>
              </div>

              {process.upstreamProcesses && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Попередній процес</span>
                  <p className="text-foreground/90">{process.upstreamProcesses}</p>
                </div>
              )}
              {process.downstreamProcesses && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Наступний процес</span>
                  <p className="text-foreground/90">{process.downstreamProcesses}</p>
                </div>
              )}
            </div>
          </section>

          {/* Кроки процесу */}
          <section className="space-y-3">
            <h3 className="text-base font-bold border-b border-border pb-2 text-foreground">Кроки процесу AS-IS</h3>
            {process.steps && process.steps.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden text-sm bg-card">
                <table className="w-full text-left">
                  <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">№</th>
                      <th className="p-2.5">Назва кроку</th>
                      <th className="p-2.5">Опис дії</th>
                      <th className="p-2.5">Хто виконує</th>
                      <th className="p-2.5">Документ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {process.steps.map((step: any, index: number) => (
                      <tr key={step.id || index} className="hover:bg-muted/30">
                        <td className="p-2.5 text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                        <td className="p-2.5 font-medium text-foreground">{step.name}</td>
                        <td className="p-2.5 text-muted-foreground">{step.description || "—"}</td>
                        <td className="p-2.5 text-foreground/80">{step.executorRole || "—"}</td>
                        <td className="p-2.5">
                          {step.docUrl ? (
                            <a href={step.docUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                              Посилання ↗
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-lg text-center border border-border">
                Кроки ще не додані або знаходяться на етапі заповнення
              </p>
            )}
          </section>

          {/* Показники процесу */}
          <section className="space-y-3">
            <h3 className="text-base font-bold border-b border-border pb-2 text-foreground">Показники процесу</h3>
            {process.kpis && process.kpis.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden text-sm bg-card">
                <table className="w-full text-left">
                  <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">Показник</th>
                      <th className="p-2.5">Одиниця</th>
                      <th className="p-2.5">Джерело даних</th>
                      <th className="p-2.5">Частота</th>
                      <th className="p-2.5">Цільове значення</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {process.kpis.map((kpi: any, index: number) => (
                      <tr key={kpi.id || index} className="hover:bg-muted/30">
                        <td className="p-2.5 font-medium text-foreground">{kpi.name}</td>
                        <td className="p-2.5 text-muted-foreground">{kpi.unit || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{kpi.dataSource || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{kpi.frequency || "—"}</td>
                        <td className="p-2.5 font-semibold text-foreground">{kpi.targetValue || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-lg text-center border border-border">
                Показники процесу ще не внесені
              </p>
            )}
          </section>

          {/* BPMN Схема */}
          {process.bpmnUrl && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Схема процесу BPMN</h4>
                  <p className="text-xs text-muted-foreground">Доступна зовнішня інтерактивна діаграма</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(process.bpmnUrl || '', '_blank')}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Відкрити BPMN <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </section>
          )}
        </div>
      </Card>
    )
}
