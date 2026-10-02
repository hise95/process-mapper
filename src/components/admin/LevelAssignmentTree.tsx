"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, ChevronRight, ChevronDown, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function LevelAssignmentTree() {
  const [levels, setLevels] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})
  
  // Add Level Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addDepth, setAddDepth] = useState<"L1" | "L2" | "L3">("L1")
  const [selectedL1, setSelectedL1] = useState<string>("")
  const [selectedL2, setSelectedL2] = useState<string>("")
  const [newName, setNewName] = useState("")
  const [savingAdd, setSavingAdd] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [levelsRes, usersRes] = await Promise.all([
        fetch("/api/process-levels?all=true"),
        fetch("/api/users")
      ])
      if (levelsRes.ok && usersRes.ok) {
        const levelsData = await levelsRes.json()
        const usersData = await usersRes.json()
        setLevels(levelsData)
        setUsers(usersData.filter((u: any) => u.role === "PROCESS_ANALYST" || u.role === "ADMIN" || u.role === "PROCESS_OWNER"))
        
        // Expand L1 by default
        const initialExpanded: Record<string, boolean> = {}
        levelsData.forEach((l1: any) => {
          initialExpanded[l1.id] = true
        })
        setExpandedNodes(initialExpanded)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAssignAdmin = async (levelId: string, adminId: string | null) => {
    try {
      const res = await fetch(`/api/process-levels/${levelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: adminId === "unassigned" ? null : adminId }),
      })
      if (res.ok) {
        alert("Відповідального оновлено")
        fetchData()
      } else {
        alert("Помилка оновлення")
      }
    } catch (error) {
      alert("Сталася помилка")
    }
  }

  const handleAddLevel = async () => {
    if (!newName.trim()) return

    let parentId = null
    if (addDepth === "L2") {
      if (!selectedL1) { alert("Виберіть L1 (Тип процесу)"); return }
      parentId = selectedL1
    } else if (addDepth === "L3") {
      if (!selectedL2) { alert("Виберіть батьківський L2"); return }
      parentId = selectedL2
    }

    setSavingAdd(true)
    try {
      const res = await fetch("/api/process-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, parentId }),
      })
      if (res.ok) {
        setNewName("")
        setShowAddForm(false)
        fetchData()
      } else {
        alert("Помилка створення")
      }
    } catch (error) {
      alert("Сталася помилка")
    } finally {
      setSavingAdd(false)
    }
  }

  const handleDeleteLevel = async (levelId: string, levelName: string) => {
    if (!confirm(`Ви впевнені, що хочете видалити рівень "${levelName}"?`)) return
    try {
      const res = await fetch(`/api/process-levels/${levelId}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        fetchData()
      } else {
        alert(data.error || "Помилка при видаленні рівня")
      }
    } catch (e) {
      console.error(e)
      alert("Виникла помилка при видаленні")
    }
  }

  const handleDeleteProcess = async (procId: string, procTitle: string) => {
    if (!confirm(`Ви впевнені, що хочете остаточно видалити процес "${procTitle}"?`)) return
    try {
      const res = await fetch(`/api/processes/${procId}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        fetchData()
      } else {
        alert(data.error || "Помилка при видаленні процесу")
      }
    } catch (e) {
      console.error(e)
      alert("Виникла помилка при видаленні")
    }
  }

  const renderLevel = (level: any, depth: number) => {
    const isExpanded = !!expandedNodes[level.id]
    const hasSubLevels = level.children && level.children.length > 0
    const hasProcesses = level.processes && level.processes.length > 0
    const hasChildren = hasSubLevels || hasProcesses
    
    return (
      <div key={level.id} className="mb-2" style={{ marginLeft: depth > 1 ? "1.5rem" : "0" }}>
        <div className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/20 transition-colors">
          <div 
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            onClick={() => toggleNode(level.id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <div className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium truncate">{level.name}</span>
            <Badge variant="secondary" className="text-[10px] shrink-0">L{depth}</Badge>
            {hasProcesses && (
              <span className="text-xs text-muted-foreground shrink-0">({level.processes.length} проц.)</span>
            )}
          </div>
          
          <div className="w-56 shrink-0">
            <Select 
              value={level.adminId || "unassigned"} 
              onValueChange={(val) => handleAssignAdmin(level.id, val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Відповідальний">
                  {!level.adminId || level.adminId === "unassigned" 
                    ? "Не призначено" 
                    : users.find(u => u.id === level.adminId)
                      ? `${users.find(u => u.id === level.adminId)?.fullName} (${users.find(u => u.id === level.adminId)?.role})`
                      : level.adminId}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Не призначено</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            title="Видалити рівень"
            onClick={() => handleDeleteLevel(level.id, level.name)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2 border-l-2 ml-3 pl-3 space-y-1">
            {level.children?.map((child: any) => renderLevel(child, depth + 1))}
            {level.processes?.map((proc: any) => (
              <div key={proc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/50 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-mono text-muted-foreground shrink-0">{proc.code || '—'}</span>
                  <span className="font-medium text-foreground truncate">{proc.title}</span>
                  {proc.status && (
                    <Badge variant="outline" className="text-[9px] py-0 shrink-0">
                      {proc.status}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  title="Видалити процес"
                  onClick={() => handleDeleteProcess(proc.id, proc.title)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Дерево рівнів</h3>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Додати рівень
        </Button>
      </div>

      {showAddForm && (
        <div className="p-4 mb-6 border rounded-md bg-muted/10 flex flex-col gap-4">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="w-48 space-y-1">
              <label className="text-xs font-medium">Який рівень створюємо?</label>
              <Select value={addDepth} onValueChange={(val: any) => { setAddDepth(val); setSelectedL1(""); setSelectedL2(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">Кореневий (Тип: L1)</SelectItem>
                  <SelectItem value="L2">Підрівень (L2)</SelectItem>
                  <SelectItem value="L3">Підрівень (L3)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addDepth !== "L1" && (
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-xs font-medium">Батьківський L1 (Тип процесу)</label>
                <Select value={selectedL1} onValueChange={(val) => { setSelectedL1(val || ""); setSelectedL2(""); }}>
                  <SelectTrigger><SelectValue placeholder="Оберіть L1..." /></SelectTrigger>
                  <SelectContent>
                    {levels.map(l1 => (
                      <SelectItem key={l1.id} value={l1.id}>{l1.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addDepth === "L3" && (
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-xs font-medium">Батьківський L2</label>
                <Select value={selectedL2} onValueChange={(val) => setSelectedL2(val || "")} disabled={!selectedL1}>
                  <SelectTrigger><SelectValue placeholder="Оберіть L2..." /></SelectTrigger>
                  <SelectContent>
                    {levels.find(l1 => l1.id === selectedL1)?.children?.map((l2: any) => (
                      <SelectItem key={l2.id} value={l2.id}>{l2.name}</SelectItem>
                    )) || <SelectItem value="none" disabled>Немає дочірніх рівнів</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">Назва нового рівня</label>
              <Input 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="Наприклад: HR процеси" 
              />
            </div>
            <Button onClick={handleAddLevel} disabled={!newName.trim() || savingAdd}>
              {savingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Зберегти"}
            </Button>
          </div>
        </div>
      )}

      {levels.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center p-8 border border-dashed rounded-lg">
          Дерево рівнів порожнє
        </p>
      ) : (
        <div className="space-y-1">
          {levels.map(l1 => renderLevel(l1, 1))}
        </div>
      )}
    </div>
  )
}
