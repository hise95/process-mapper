"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function UserRoleTable({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Для зберігання вибраної нової ролі, якщо вона відрізняється від поточної
  const [newRoles, setNewRoles] = useState<Record<string, string>>({})

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = (userId: string, role: string) => {
    setNewRoles(prev => ({ ...prev, [userId]: role }))
  }

  const handleSave = async (userId: string) => {
    const role = newRoles[userId]
    if (!role) return

    setUpdatingId(userId)
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })

      if (res.ok) {
        // Оновлюємо локальний стан
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
        setNewRoles(prev => {
          const newState = { ...prev }
          delete newState[userId]
          return newState
        })
        alert("Роль успішно оновлено")
      } else {
        alert("Помилка оновлення ролі")
      }
    } catch (error) {
      alert("Сталася помилка")
    } finally {
      setUpdatingId(null)
    }
  }

  const roleLabels: Record<string, string> = {
    "ADMIN": "Адміністратор",
    "PROCESS_ANALYST": "Процесний аналітик",
    "PROCESS_OWNER": "Власник процесу",
    "PROCESS_MANAGER": "Менеджер процесу",
    "EMPLOYEE": "Працівник",
    "USER": "Працівник"
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="p-4 font-medium rounded-tl-md">ПІБ</th>
            <th className="p-4 font-medium">Email</th>
            <th className="p-4 font-medium">Поточна роль</th>
            <th className="p-4 font-medium">Нова роль</th>
            <th className="p-4 font-medium rounded-tr-md w-24">Дії</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map(user => {
            const isSelf = user.id === currentUser?.id
            const selectedRole = newRoles[user.id] || user.role
            const hasChanged = newRoles[user.id] && newRoles[user.id] !== user.role

            return (
              <tr key={user.id} className={`hover:bg-muted/20 ${isSelf ? "bg-muted/10" : ""}`}>
                <td className="p-4 font-medium">{user.fullName || user.name || "—"} {isSelf && "(Ви)"}</td>
                <td className="p-4 text-muted-foreground">{user.email}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-secondary rounded text-xs font-medium">
                    {roleLabels[user.role] || user.role}
                  </span>
                </td>
                <td className="p-4">
                  <Select 
                    disabled={isSelf} 
                    value={selectedRole} 
                    onValueChange={(val) => handleRoleChange(user.id, val)}
                  >
                    <SelectTrigger className="w-full h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Адміністратор</SelectItem>
                      <SelectItem value="PROCESS_ANALYST">Процесний аналітик</SelectItem>
                      <SelectItem value="PROCESS_OWNER">Власник процесу</SelectItem>
                      <SelectItem value="PROCESS_MANAGER">Менеджер процесу</SelectItem>
                      <SelectItem value="EMPLOYEE">Працівник</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-4">
                  <Button 
                    size="sm" 
                    disabled={isSelf || !hasChanged || updatingId === user.id}
                    onClick={() => handleSave(user.id)}
                  >
                    {updatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Зберегти"}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
