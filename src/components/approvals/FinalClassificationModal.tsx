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
  parentId?: string | null;
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
  const [createNewSublevel, setCreateNewSublevel] = useState(false)
  const [newSublevelName, setNewSublevelName] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetch("/api/levels")
        .then(res => res.json())
        .then(data => setLevels(data))
        .catch(console.error)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!code || !processType || !levelId || (createNewSublevel && !newSublevelName)) {
      alert("Всі обов'язкові поля повинні бути заповнені")
      return
    }

    setLoading(true)
    try {
      let finalLevelId = levelId;
      
      // Якщо обрано створення підрівня
      if (createNewSublevel && newSublevelName) {
        const lvlRes = await fetch("/api/levels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSublevelName, parentId: levelId })
        });
        if (!lvlRes.ok) throw new Error("Помилка створення підрівня");
        const newLvl = await lvlRes.json();
        finalLevelId = newLvl.id;
      }

      // 1. Оновлюємо класифікаційні дані
      const patchRes = await fetch(`/api/processes/${processId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, processType, levelId: finalLevelId }),
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
      <DialogContent className="sm:max-w-[600px]">
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Виберіть тип">
                  {processType === 'MANAGERIAL' ? 'Управлінський' : processType === 'SERVICE' ? 'Сервісний' : 'Основний'}
                </SelectValue>
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Виберіть рівень">
                  {(() => {
                    if (!levelId) return null;
                    const l = levels.find(x => x.id === levelId);
                    if (!l) return null;
                    return l.parent ? `${l.parent.name} → ${l.name} (L${l.depth})` : `${l.name} (L${l.depth})`;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[550px]">
                {(() => {
                  const getRootId = (id: string): string => {
                    let current = levels.find(l => l.id === id);
                    while (current && current.parentId) {
                      const parent = levels.find(l => l.id === current!.parentId);
                      if (!parent) break;
                      current = parent;
                    }
                    return current ? current.id : id;
                  };

                  const targetPrefix = processType === 'MAIN' ? 'B.'
                                     : processType === 'SERVICE' ? 'S.'
                                     : 'M.';

                  const filtered = levels.filter(l => {
                    const rootId = getRootId(l.id);
                    const root = levels.find(rl => rl.id === rootId);
                    return root && root.name.startsWith(targetPrefix);
                  });
                  
                  return filtered.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.parent ? `${level.parent.name} → ` : ''}{level.name} (L{level.depth})
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          {levelId && (
            <div className="flex flex-col gap-3 mt-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="create-sub" 
                  checked={createNewSublevel} 
                  onChange={(e) => setCreateNewSublevel(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={loading}
                />
                <Label htmlFor="create-sub" className="font-medium cursor-pointer">
                  Створити новий підрівень (L{(() => {
                    const l = levels.find(x => x.id === levelId);
                    return l ? l.depth + 1 : 2;
                  })()}) і прив'язати процес до нього?
                </Label>
              </div>
              {createNewSublevel && (
                <div className="pl-6 grid gap-2">
                  <Label htmlFor="subname" className="text-left text-sm text-muted-foreground">
                    Назва нового підрівня <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subname"
                    placeholder="Напр. Аналітика продажів"
                    value={newSublevelName}
                    onChange={(e) => setNewSublevelName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Скасувати
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !code || !levelId || !processType || (createNewSublevel && !newSublevelName)}
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
