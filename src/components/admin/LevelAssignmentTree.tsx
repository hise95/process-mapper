"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function LevelAssignmentTree() {
  const [levels, setLevels] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [parentId, setParentId] = useState<string>("root")
  const [savingAdd, setSavingAdd] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [levelsRes, usersRes] = await Promise.all([
        fetch("/api/process-levels"),
        fetch("/api/users")
      ])
      if (levelsRes.ok && usersRes.ok) {
        const levelsData = await levelsRes.json()
        const usersData = await usersRes.json()
        setLevels(levelsData)
        setUsers(usersData.filter((u: any) => u.role === "ADMIN_ANALYST" || u.role === "PROCESS_ANALYST" || u.role === "ADMIN" || u.role === "PROCESS_OWNER"))
        
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
        body: JSON.stringify({ adminId: adminId === "none" ? null : adminId }),
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
    setSavingAdd(true)
    try {
      const res = await fetch("/api/process-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, parentId: parentId === "root" ? null : parentId }),
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

  // Recursive flat list for the parent select dropdown
  const getFlatLevels = (nodes: any[], depth = 1): any[] => {
    let result: any[] = []
    nodes.forEach(node => {
      result.push({ ...node, depth })
      if (node.children && node.children.length > 0) {
        result = [...result, ...getFlatLevels(node.children, depth + 1)]
      }
    })
    return result
  }
  const flatLevels = getFlatLevels(levels)

  const renderLevel = (level: any, depth: number) => {
    const isExpanded = !!expandedNodes[level.id]
    const hasChildren = level.children && level.children.length > 0
    
    return (
      <div key={level.id} className="mb-2" style={{ marginLeft: depth > 1 ? "2rem" : "0" }}>
        <div className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/20 transition-colors">
          <div 
            className="flex items-center gap-2 cursor-pointer w-64"
            onClick={() => toggleNode(level.id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="w-4 h-4" />
            )}
            <span className="font-medium truncate">{level.name}</span>
            <Badge variant="secondary" className="text-[10px]">L{depth}</Badge>
          </div>
          
          <div className="ml-auto w-64">
            <Select 
              value={level.adminId || "none"} 
              onValueChange={(val) => handleAssignAdmin(level.id, val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Відповідальний" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не призначено</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2 border-l-2 ml-3 pl-3">
            {level.children.map((child: any) => renderLevel(child, depth + 1))}
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
        <div className="p-4 mb-6 border rounded-md bg-muted/10 flex gap-4 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Назва рівня</label>
            <Input 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="Наприклад: HR процеси" 
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Батьківський рівень</label>
            <Select value={parentId} onValueChange={(val) => setParentId(val || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Кореневий рівень (L1)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Кореневий рівень (L1)</SelectItem>
                {flatLevels.map(fl => (
                  <SelectItem key={fl.id} value={fl.id}>
                    {`${"-".repeat(fl.depth - 1)} ${fl.name} (L${fl.depth})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddLevel} disabled={!newName.trim() || savingAdd}>
            {savingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Зберегти"}
          </Button>
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
