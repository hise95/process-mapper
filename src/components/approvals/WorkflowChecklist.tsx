"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, Circle, Clock, History, ChevronDown, ChevronUp } from "lucide-react"
import type { SessionUser, ProcessForChecklist } from "@/lib/types"
import { FinalClassificationModal } from "./FinalClassificationModal"

export function WorkflowChecklist({
  process,
  session,
  onActionComplete,
}: {
  process: ProcessForChecklist;
  session: SessionUser;
  onActionComplete: () => void;
}) {
  const [comment, setComment] = useState("")
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [isClassificationModalOpen, setIsClassificationModalOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleAction = async (transition: string) => {
    setLoadingAction(transition)
    try {
      const res = await fetch(`/api/processes/${process.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transition, comment }),
      })
      if (res.ok) {
        setComment("")
        onActionComplete()
      } else {
        const errorData = await res.json().catch(() => null)
        alert(errorData?.error || "Помилка виконання дії")
      }
    } catch (error) {
      console.error(error)
      alert("Сталася помилка з'єднання")
    } finally {
      setLoadingAction(null)
    }
  }

  // ── Визначення ролі та доступних дій ──
  const isAnalyst = session?.role === "ADMIN_ANALYST"
  const isOwner   = session?.role === "PROCESS_OWNER"

  // Аналітик на етапі IN_REVIEW_ANALYST
  const canAnalystForwardToOwner = isAnalyst && process.status === "IN_REVIEW_ANALYST"

  // Власник (або Аналітик з розширеними правами) на етапі IN_REVIEW_OWNER
  const canOwnerApprove = (isOwner || isAnalyst) && process.status === "IN_REVIEW_OWNER"

  // Фінальне затвердження (з класифікацією) доступне Аналітику на етапі IN_REVIEW_ANALYST або IN_REVIEW_OWNER
  const canFinalApprove = isAnalyst && (process.status === "IN_REVIEW_ANALYST" || process.status === "IN_REVIEW_OWNER")

  const ownerAlreadyApproved = process.historyLogs?.some((l: { action: string }) =>
    l.action === 'СХВАЛЕНО_ВЛАСНИКОМ'
  )

  const stages = [
    { name: "Чернетка",    status: "DRAFT",             passed: process.status !== "DRAFT" },
    { name: "Аналітик",    status: "IN_REVIEW_ANALYST", active: process.status === "IN_REVIEW_ANALYST" && !ownerAlreadyApproved, passed: ["IN_REVIEW_OWNER", "APPROVED"].includes(process.status) },
    { name: "Власник",     status: "IN_REVIEW_OWNER",   active: process.status === "IN_REVIEW_OWNER",  passed: process.status === "APPROVED" || ownerAlreadyApproved },
    { name: "Затверджено", status: "APPROVED",          active: process.status === "APPROVED",        passed: process.status === "APPROVED" },
  ]

  return (
    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
      {/* Верхня смужка: життєвий цикл етапів */}
      <div className="p-3 border-b bg-slate-50/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto py-1">
          {stages.map((stage, idx) => (
            <div key={stage.name} className="flex items-center gap-1.5 shrink-0 text-xs">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] 
                ${stage.passed ? "bg-emerald-500 text-white" : stage.active ? "bg-[#fa4616] text-white animate-pulse" : "bg-slate-200 text-slate-500"}`}
              >
                {stage.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className={`font-medium ${stage.active ? "text-[#fa4616] font-bold" : stage.passed ? "text-emerald-700" : "text-slate-500"}`}>
                {stage.name}
              </span>
              {idx < stages.length - 1 && <span className="text-slate-300 ml-1">→</span>}
            </div>
          ))}
        </div>

        {/* Кнопка перегляду історії */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-slate-600 gap-1 h-7 px-2 shrink-0"
        >
          <History className="w-3.5 h-3.5" />
          <span>Історія ({process.historyLogs?.length || 0})</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Випадаюча історія змін (якщо натиснуто) */}
      {showHistory && (
        <div className="p-3 bg-slate-100/80 border-b max-h-40 overflow-y-auto space-y-2 text-xs">
          {process.historyLogs && process.historyLogs.length > 0 ? (
            process.historyLogs.map((history: any, idx: number) => (
              <div key={idx} className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5 last:border-0">
                <div>
                  <span className="font-semibold text-slate-800">{history.user?.fullName || "Користувач"}</span>:{" "}
                  <span className="text-slate-600 font-medium">{history.action}</span>
                  {history.comment && <p className="italic text-slate-500 mt-0.5">«{history.comment}»</p>}
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(history.timestamp).toLocaleString("uk-UA")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center">Історія ще порожня</p>
          )}
        </div>
      )}

      {/* Панель прийняття рішень (завжди видима) */}
      <div className="p-3.5 space-y-3 bg-white">
        {(canAnalystForwardToOwner || canFinalApprove || canOwnerApprove) ? (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Textarea
                placeholder="Коментар (необов'язково для схвалення, обов'язково при відхиленні)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none h-10 min-h-[38px] py-2 text-xs flex-1 border-slate-300 focus-visible:ring-[#fa4616]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Етап перевірки Аналітика */}
              {isAnalyst && process.status === "IN_REVIEW_ANALYST" && (
                <>
                  <Button
                    onClick={() => handleAction("ANALYST_APPROVE")}
                    disabled={!!loadingAction}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 px-3"
                  >
                    {loadingAction === "ANALYST_APPROVE" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Схвалити → передати власнику
                  </Button>
                  
                  <Button
                    onClick={() => setIsClassificationModalOpen(true)}
                    disabled={!!loadingAction}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3"
                  >
                    {loadingAction === "FINAL_APPROVE" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    ✅ Фінально затвердити та опублікувати
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => handleAction("ANALYST_REJECT")}
                    disabled={!!loadingAction || !comment.trim()}
                    className="text-xs h-9 px-3 ml-auto"
                  >
                    {loadingAction === "ANALYST_REJECT" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Повернути на доопрацювання
                  </Button>
                </>
              )}

              {/* Етап погодження Власника */}
              {canOwnerApprove && (
                <>
                  <Button 
                    onClick={() => handleAction("OWNER_APPROVE")} 
                    disabled={!!loadingAction}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs h-9 px-4"
                  >
                    {loadingAction === "OWNER_APPROVE" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Погодити {isAnalyst && !isOwner ? "(за Власника)" : ""}
                  </Button>

                  {isAnalyst && (
                    <Button 
                      onClick={() => setIsClassificationModalOpen(true)}
                      disabled={!!loadingAction}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3"
                    >
                      ✅ Фінально затвердити та опублікувати
                    </Button>
                  )}

                  <Button 
                    variant="destructive" 
                    onClick={() => handleAction("OWNER_REJECT")}
                    disabled={!!loadingAction || !comment.trim()}
                    className="text-xs h-9 px-3 ml-auto"
                  >
                    {loadingAction === "OWNER_REJECT" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Відхилити
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-center text-slate-500 py-2 bg-slate-50 rounded border border-dashed">
            {process.status === "APPROVED" ? "Процес вже затверджено та внесено до Репозиторію" : "Немає доступних дій для вашої ролі на поточному етапі"}
          </div>
        )}
      </div>

      <FinalClassificationModal
        processId={process.id}
        isOpen={isClassificationModalOpen}
        onClose={() => setIsClassificationModalOpen(false)}
        onSuccess={() => {
          setIsClassificationModalOpen(false)
          setComment("")
          onActionComplete()
        }}
        comment={comment}
      />
    </Card>
  )
}
