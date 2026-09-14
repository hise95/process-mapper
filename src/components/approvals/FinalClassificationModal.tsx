"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface ProcessLevel {
  id: string;
  name: string;
  depth: number;
  parent?: { name: string } | null;
}

interface FinalClassificationModalProps {
  processId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  comment: string;
}

export function FinalClassificationModal({ processId, isOpen, onClose, onSuccess, comment }: FinalClassificationModalProps) {
  const [loading, setLoading] = useState(false)
  const [levels, setLevels] = useState<ProcessLevel[]>([])
  const [code, setCode] = useState("")
  const [processType, setProcessType] = useState("MAIN")
  const [levelId, setLevelId] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetch("/api/levels")
        .then(res => res.json())
        .then(data => setLevels(data))
        .catch(console.error)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!code || !processType || !levelId) {
      alert("Всі поля обов'язкові для заповнення")
      return
    }

    setLoading(true)
    try {
      // 1. Оновлюємо класифікаційні дані
      const patchRes = await fetch(`/api/processes/${processId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, processType, levelId }),
      })
      
      if (!patchRes.ok) {
        const errorData = await patchRes.json()
        throw new Error(errorData.error || "Помилка оновлення даних")
      }

      // 2. Фінально затверджуємо процес
      const approveRes = await fetch(`/api/processes/${processId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transition: "FINAL_APPROVE", comment }),
      })

      if (!approveRes.ok) {
        const errorData = await approveRes.json()
        throw new Error(errorData.error || "Помилка фінального затвердження")
      }

      onSuccess()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Фінальна класифікація</DialogTitle>
          <DialogDescription>
            Перед публікацією в репозиторій необхідно заповнити системні дані процесу.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="code" className="text-left font-medium">
              Код процесу <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              placeholder="Напр. P-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="grid gap-2">
            <Label className="text-left font-medium">
              Тип процесу <span className="text-red-500">*</span>
            </Label>
            <Select value={processType} onValueChange={(val) => setProcessType(val || "MAIN")} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGERIAL">Управлінський</SelectItem>
                <SelectItem value="MAIN">Основний</SelectItem>
                <SelectItem value="SERVICE">Сервісний</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-left font-medium">
              Рівень процесу <span className="text-red-500">*</span>
            </Label>
            <Select value={levelId} onValueChange={(val) => setLevelId(val || "")} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть рівень" />
              </SelectTrigger>
              <SelectContent>
                {levels.filter(l => l.depth >= 2).map(level => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.parent ? `${level.parent.name} → ` : ''}{level.name} (L{level.depth})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Скасувати
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !code || !levelId || !processType}
            className="bg-[#fa4616] hover:bg-[#d93a10] text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Затвердити та опублікувати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
