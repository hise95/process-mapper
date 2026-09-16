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
  DRAFT: { label: "Чернетка (Паспорт)", color: "bg-slate-100 text-slate-700" },
  PASSPORT_REVIEW_ANALYST: { label: "Паспорт: Перевірка А.", color: "bg-amber-100 text-amber-800 border-amber-300" },
  PASSPORT_REVIEW_OWNER: { label: "Паспорт: Погодження В.", color: "bg-orange-100 text-orange-800 border-orange-300" },
  STEPS_DRAFT: { label: "Чернетка (Кроки)", color: "bg-slate-100 text-slate-700" },
  STEPS_REVIEW_ANALYST: { label: "Кроки: Перевірка А.", color: "bg-amber-100 text-amber-800 border-amber-300" },
  STEPS_REVIEW_OWNER: { label: "Кроки: Погодження В.", color: "bg-orange-100 text-orange-800 border-orange-300" },
  KPIS_DRAFT: { label: "Чернетка (Показники)", color: "bg-slate-100 text-slate-700" },
  KPIS_REVIEW_ANALYST: { label: "Показники: Перевірка А.", color: "bg-amber-100 text-amber-800 border-amber-300" },
  KPIS_REVIEW_OWNER: { label: "Показники: Погодження В.", color: "bg-orange-100 text-orange-800 border-orange-300" },
  FINAL_APPROVAL_ANALYST: { label: "Фінальне затвердження", color: "bg-blue-100 text-blue-800 border-blue-300" },
  APPROVED: { label: "Затверджено", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
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
      <div className="w-[32%] shrink-0 flex flex-col h-full border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-3.5 border-b font-bold text-slate-800 flex items-center justify-between bg-slate-50/70">
          <span>Очікують на погодження</span>
          <Badge className="bg-[#fa4616] text-white hover:bg-[#d93a10] border-none font-bold">
            {processes.length}
          </Badge>
        </div>
        
        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#fa4616]" />
            </div>
          ) : processes.length === 0 ? (
            <div className="text-center text-slate-500 py-12 px-4 text-sm">
              ✨ Немає процесів, що потребують вашої перевірки
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {processes.map(process => {
                const isSelected = selectedProcessId === process.id
                const statusMeta = STATUS_LABELS[process.status] || { label: process.status, color: "bg-slate-100" }

                return (
                  <div
                    key={process.id}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-[#fa4616] bg-orange-50/50 shadow-sm" 
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedProcessId(process.id)}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h3 className={`font-semibold text-sm line-clamp-2 ${isSelected ? "text-[#fa4616]" : "text-slate-900"}`}>
                        {process.title}
                      </h3>
                      {process.code && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {process.code}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-100">
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
          <div className="h-full border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 bg-white shadow-sm">
            Оберіть процес зі списку ліворуч для перегляду та погодження
          </div>
        )}
      </div>
    </div>
  )
}
