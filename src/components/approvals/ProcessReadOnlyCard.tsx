"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ExternalLink, UserCheck, ShieldCheck } from "lucide-react"

const STATUS_LABELS_UA: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Чернетка", className: "bg-slate-100 text-slate-700" },
  IN_REVIEW_ANALYST: { label: "На перевірці аналітика", className: "bg-amber-500 text-white" },
  IN_REVIEW_OWNER: { label: "На погодженні власника", className: "bg-orange-500 text-white" },
  APPROVED: { label: "Затверджено", className: "bg-emerald-600 text-white" },
  ARCHIVED: { label: "В архіві", className: "bg-slate-400 text-white" },
};

const TYPE_LABELS_UA: Record<string, string> = {
  MANAGERIAL: "Управлінський",
  MAIN: "Основний",
  SERVICE: "Сервісний",
};

export function ProcessReadOnlyCard({ process }: { process: any }) {
  if (!process) return null;

  const statusMeta = STATUS_LABELS_UA[process.status] || { label: process.status, className: "bg-[#fa4616] text-white" };
  const typeLabel = TYPE_LABELS_UA[process.processType] || process.processType || "Тип не вказано";

  return (
    <Card className="h-full flex flex-col overflow-hidden relative border border-slate-200 shadow-sm bg-white">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center justify-between shadow-xs gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono shrink-0 bg-slate-100 text-slate-800">
            {process.code || "БЕЗ КОДУ"}
          </Badge>
          <h2 className="text-sm sm:text-base font-bold truncate text-slate-900">{process.title}</h2>
          <Badge variant="outline" className="text-[11px] shrink-0">v{process.version || "1.0"}</Badge>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs text-slate-600 whitespace-nowrap">{typeLabel}</Badge>
          <Badge className={`${statusMeta.className} border-none text-xs font-semibold whitespace-nowrap shadow-xs`}>
            {statusMeta.label}
          </Badge>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.open(`/processes/${process.id}`, '_blank')}
            className="text-xs h-7 px-2 text-[#fa4616] hover:bg-orange-50 font-medium gap-1"
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
            <h3 className="text-base font-bold border-b pb-2 text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#fa4616]" />
              Паспорт процесу
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Менеджер процесу</span>
                <span className="font-medium text-slate-800">{process.manager?.fullName || "—"}</span>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Власник процесу</span>
                <span className="font-medium text-slate-800">{process.owner?.fullName || "—"}</span>
              </div>

              <div className="md:col-span-2 p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Мета процесу</span>
                <p className="whitespace-pre-wrap text-slate-700">{process.objective || "—"}</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Вхід (що запускає процес)</span>
                <p className="whitespace-pre-wrap text-slate-700">{process.input || "—"}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Вихід (результат роботи)</span>
                <p className="whitespace-pre-wrap text-slate-700">{process.output || "—"}</p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Постачальник входу</span>
                <p className="text-slate-700">{process.inputSupplier || "—"}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Клієнти процесу</span>
                <p className="whitespace-pre-wrap text-slate-700">{process.clients || "—"}</p>
              </div>

              <div className="md:col-span-2 p-3 bg-muted/30 rounded-lg border">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Учасники процесу</span>
                <p className="whitespace-pre-wrap text-slate-700">{process.participants || "—"}</p>
              </div>

              {process.upstreamProcesses && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Попередній процес</span>
                  <p className="text-slate-700">{process.upstreamProcesses}</p>
                </div>
              )}
              {process.downstreamProcesses && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Наступний процес</span>
                  <p className="text-slate-700">{process.downstreamProcesses}</p>
                </div>
              )}
            </div>
          </section>

          {/* Кроки процесу */}
          <section className="space-y-3">
            <h3 className="text-base font-bold border-b pb-2 text-slate-800">Кроки процесу AS-IS</h3>
            {process.steps && process.steps.length > 0 ? (
              <div className="border rounded-lg overflow-hidden text-sm">
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
                  <tbody className="divide-y">
                    {process.steps.map((step: any, index: number) => (
                      <tr key={step.id || index} className="hover:bg-muted/20">
                        <td className="p-2.5 text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                        <td className="p-2.5 font-medium text-slate-800">{step.name}</td>
                        <td className="p-2.5 text-slate-600">{step.description || "—"}</td>
                        <td className="p-2.5 text-slate-700">{step.executorRole || "—"}</td>
                        <td className="p-2.5">
                          {step.docUrl ? (
                            <a href={step.docUrl} target="_blank" rel="noreferrer" className="text-[#fa4616] hover:underline text-xs">
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
              <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-lg text-center">
                Кроки ще не додані або знаходяться на етапі заповнення
              </p>
            )}
          </section>

          {/* KPI */}
          <section className="space-y-3">
            <h3 className="text-base font-bold border-b pb-2 text-slate-800">Показники KPI</h3>
            {process.kpis && process.kpis.length > 0 ? (
              <div className="border rounded-lg overflow-hidden text-sm">
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
                  <tbody className="divide-y">
                    {process.kpis.map((kpi: any, index: number) => (
                      <tr key={kpi.id || index} className="hover:bg-muted/20">
                        <td className="p-2.5 font-medium text-slate-800">{kpi.name}</td>
                        <td className="p-2.5 text-slate-600">{kpi.unit || "—"}</td>
                        <td className="p-2.5 text-slate-600">{kpi.dataSource || "—"}</td>
                        <td className="p-2.5 text-slate-600">{kpi.frequency || "—"}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{kpi.targetValue || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-lg text-center">
                Показники KPI ще не внесені
              </p>
            )}
          </section>

          {/* BPMN Схема */}
          {process.bpmnUrl && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg">
                <div>
                  <h4 className="font-semibold text-sm text-slate-800">Схема процесу BPMN</h4>
                  <p className="text-xs text-muted-foreground">Доступна зовнішня інтерактивна діаграма</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(process.bpmnUrl || '', '_blank')}
                  className="border-[#fa4616] text-[#fa4616] hover:bg-[#fa4616] hover:text-white"
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
