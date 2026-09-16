"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, History, ChevronDown, ChevronUp } from "lucide-react"
import type { SessionUser, ProcessForChecklist } from "@/lib/types"
import { FinalClassificationModal } from "./FinalClassificationModal"

import { isAnalystRole } from "@/lib/permissions"

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
        alert(errorData?.error || "Помилка сервера")
      }
    } catch (error) {
      console.error(error)
      alert("Мережева помилка")
    } finally {
      setLoadingAction(null)
    }
  }

  const isAnalyst = isAnalystRole(session?.role || "")
  const isOwner = session?.role === "PROCESS_OWNER" || isAnalyst // Аналітик може погоджувати за власника

  // Визначення доступних дій
  const canApprovePassportAnalyst = isAnalyst && process.status === "PASSPORT_REVIEW_ANALYST"
  const canApprovePassportOwner = isOwner && process.status === "PASSPORT_REVIEW_OWNER"
  
  const canApproveStepsAnalyst = isAnalyst && process.status === "STEPS_REVIEW_ANALYST"
  const canApproveStepsOwner = isOwner && process.status === "STEPS_REVIEW_OWNER"
  
  const canApproveKpisAnalyst = isAnalyst && process.status === "KPIS_REVIEW_ANALYST"
  const canApproveKpisOwner = isOwner && process.status === "KPIS_REVIEW_OWNER"
  
  const canFinalApprove = isAnalyst && process.status === "FINAL_APPROVAL_ANALYST"

  const hasAnyAction = canApprovePassportAnalyst || canApprovePassportOwner || 
                       canApproveStepsAnalyst || canApproveStepsOwner || 
                       canApproveKpisAnalyst || canApproveKpisOwner || canFinalApprove

  return (
    <Card className="border border-slate-200 overflow-hidden shadow-sm bg-white mb-6">
      <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Панель погодження</span>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-slate-600 gap-1 h-7 px-2"
        >
          <History className="w-3.5 h-3.5" />
          <span>Історія ({process.historyLogs?.length || 0})</span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {showHistory && (
        <div className="p-3 bg-slate-100/80 border-b max-h-40 overflow-y-auto space-y-2 text-xs">
          {process.historyLogs && process.historyLogs.length > 0 ? (
            process.historyLogs.map((history: any, idx: number) => (
              <div key={idx} className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5 last:border-0">
                <div>
                  <span className="font-semibold text-slate-800">{history.user?.fullName || "Користувач"}</span>:{" "}
                  <span className="text-slate-600 font-medium">{history.action}</span>
                  {history.comment && <p className="italic text-slate-500 mt-0.5">"{history.comment}"</p>}
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(history.timestamp).toLocaleString("uk-UA")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center">Історія поки порожня</p>
          )}
        </div>
      )}

      <div className="p-3.5 space-y-3 bg-white">
        {hasAnyAction ? (
          <div className="space-y-2.5">
            <Textarea
              placeholder="Коментар (обов'язково для відхилення)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none h-10 min-h-[38px] py-2 text-xs w-full border-slate-300 focus-visible:ring-[#fa4616]"
            />

            <div className="flex flex-wrap items-center gap-2">
              {/* Фаза 1: Паспорт */}
              {canApprovePassportAnalyst && (
                <>
                  <Button onClick={() => handleAction("APPROVE_PASSPORT_ANALYST")} disabled={!!loadingAction} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">
                    {loadingAction === "APPROVE_PASSPORT_ANALYST" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Погодити паспорт (Аналітик)
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("REJECT_PASSPORT_ANALYST")} disabled={!!loadingAction || !comment.trim()} className="text-xs h-9">
                    Відхилити
                  </Button>
                </>
              )}
              {canApprovePassportOwner && (
                <>
                  <Button onClick={() => handleAction("APPROVE_PASSPORT_OWNER")} disabled={!!loadingAction} className="bg-green-600 hover:bg-green-700 text-white text-xs h-9">
                    {loadingAction === "APPROVE_PASSPORT_OWNER" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Погодити паспорт (Власник)
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("REJECT_PASSPORT_OWNER")} disabled={!!loadingAction || !comment.trim()} className="text-xs h-9">
                    Відхилити
                  </Button>
                </>
              )}

              {/* Фаза 2: Кроки */}
              {canApproveStepsAnalyst && (
                <>
                  <Button onClick={() => handleAction("APPROVE_STEPS_ANALYST")} disabled={!!loadingAction} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">
                    {loadingAction === "APPROVE_STEPS_ANALYST" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Погодити кроки (Аналітик)
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("REJECT_STEPS_ANALYST")} disabled={!!loadingAction || !comment.trim()} className="text-xs h-9">
                    Відхилити
                  </Button>
                </>
              )}
              {canApproveStepsOwner && (
                <>
                  <Button onClick={() => handleAction("APPROVE_STEPS_OWNER")} disabled={!!loadingAction} className="bg-green-600 hover:bg-green-700 text-white text-xs h-9">
                    {loadingAction === "APPROVE_STEPS_OWNER" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Погодити кроки (Власник)
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("REJECT_STEPS_OWNER")} disabled={!!loadingAction || !comment.trim()} className="text-xs h-9">
                    Відхилити
                  </Button>
                </>
              )}

              {/* Фаза 3: Показники */}
              {canApproveKpisAnalyst && (
                <>
                  <Button onClick={() => handleAction("APPROVE_KPIS_ANALYST")} disabled={!!loadingAction} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9">
                    {loadingAction === "APPROVE_KPIS_ANALYST" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Погодити показники (Аналітик)
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("REJECT_KPIS_ANALYST")} disabled={!!loadingAction || !comment.trim()} className="text-xs h-9">
                    Відхилити
                  </Button>
                </>
              )}
              {canApproveKpisOwner && (
                <>
                  <Button onClick={() => handleAction("APPROVE_KPIS_OWNER")} disabled={!!loadingAction} className="bg-green-600 hover:bg-green-700 text-white text-xs h-9">
                    {loadingAction === "APPROVE_KPIS_OWNER" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Погодити показники (Власник)
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("REJECT_KPIS_OWNER")} disabled={!!loadingAction || !comment.trim()} className="text-xs h-9">
                    Відхилити
                  </Button>
                </>
              )}

              {/* Фінальне затвердження */}
              {canFinalApprove && (
                <>
                  <Button onClick={() => setIsClassificationModalOpen(true)} disabled={!!loadingAction} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                    Фінально затвердити та опублікувати
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("FINAL_REJECT")} disabled={!!loadingAction || !comment.trim()} className="text-xs h-9">
                    Повернути на доопрацювання
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-center text-slate-500 py-2 bg-slate-50 rounded border border-dashed">
            {process.status === "APPROVED" ? "Процес вже затверджено та опубліковано" : "Немає доступних дій погодження для вашої ролі на цьому етапі"}
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
