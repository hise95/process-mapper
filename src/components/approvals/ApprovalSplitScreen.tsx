"use client"

import { useState, useEffect } from "react"
import { ProcessReadOnlyCard } from "./ProcessReadOnlyCard"
import { WorkflowChecklist } from "./WorkflowChecklist"
import { Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SessionUser, ProcessApprovalCard } from "@/lib/types"

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Чернетка (Паспорт)", color: "bg-muted text-muted-foreground" },
  PASSPORT_REVIEW_ANALYST: { label: "Паспорт: Перевірка А.", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  PASSPORT_REVIEW_OWNER: { label: "Паспорт: Погодження В.", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  STEPS_DRAFT: { label: "Чернетка (Кроки)", color: "bg-muted text-muted-foreground" },
  STEPS_REVIEW_ANALYST: { label: "Кроки: Перевірка А.", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  STEPS_REVIEW_OWNER: { label: "Кроки: Погодження В.", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  KPIS_DRAFT: { label: "Чернетка (Показники)", color: "bg-muted text-muted-foreground" },
  KPIS_REVIEW_ANALYST: { label: "Показники: Перевірка А.", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  KPIS_REVIEW_OWNER: { label: "Показники: Погодження В.", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  FINAL_APPROVAL_ANALYST: { label: "Фінальне затвердження", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  APPROVED: { label: "Затверджено", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
}

export function ApprovalSplitScreen({ session }: { session: SessionUser }) {
  const [processes, setProcesses] = useState<ProcessApprovalCard[]>([])
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProcesses = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/processes?pending=true")
      if (res.ok) {
        const data = await res.json()
        setProcesses(data)
        // Якщо вибраний процес був видалений або завершений, або якщо нічого не вибрано
        if (data.length > 0 && (!selectedProcessId || !data.some((p: any) => p.id === selectedProcessId))) {
          setSelectedProcessId(data[0].id)
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProcesses()
  }, [])

  const selectedProcess = processes.find(p => p.id === selectedProcessId)

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Ліва панель: 35% */}
      <div className="w-[32%] shrink-0 flex flex-col h-full border border-border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="p-3.5 border-b border-border font-bold text-foreground flex items-center justify-between bg-muted/40">
          <span>Очікують на погодження</span>
          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 border-none font-bold">
            {processes.length}
          </Badge>
        </div>
        
        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : processes.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-4 text-sm">
              ✨ Немає процесів, що потребують вашої перевірки
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {processes.map(process => {
                const isSelected = selectedProcessId === process.id
                const statusMeta = STATUS_LABELS[process.status] || { label: process.status, color: "bg-muted" }

                return (
                  <div
                    key={process.id}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"
                    }`}
                    onClick={() => setSelectedProcessId(process.id)}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h3 className={`font-semibold text-sm line-clamp-2 ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {process.title}
                      </h3>
                      {process.code && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {process.code}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${statusMeta.color}`}>
                        {statusMeta.label}
                      </Badge>
                      <span>
                        {process.updatedAt ? new Date(process.updatedAt).toLocaleDateString("uk-UA") : ""}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Права панель: 68% */}
      <div className="flex-1 flex flex-col h-full gap-3 overflow-hidden">
        {selectedProcess ? (
          <>
            {/* 1. Блок рішень (WorkflowChecklist) — ЗВЕРХУ, завжди на видноті */}
            <div className="shrink-0">
              <WorkflowChecklist 
                process={selectedProcess} 
                session={session} 
                onActionComplete={fetchProcesses}
              />
            </div>

            {/* 2. Детальний перегляд процесу (ProcessReadOnlyCard) — ЗНИЗУ, займає весь залишок зі своїм скролом */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ProcessReadOnlyCard process={selectedProcess} />
            </div>
          </>
        ) : (
          <div className="h-full border border-border rounded-xl flex items-center justify-center text-muted-foreground bg-card shadow-sm">
            Оберіть процес зі списку ліворуч для перегляду та погодження
          </div>
        )}
      </div>
    </div>
  )
}
