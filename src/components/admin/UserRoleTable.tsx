"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2, Key, Plus, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function UserRoleTable({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const [newRoles, setNewRoles] = useState<Record<string, string>>({})

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  
  // Forms state
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '', role: 'EMPLOYEE' })
  const [newPassword, setNewPassword] = useState('')

  const isAdmin = currentUser?.role === 'ADMIN'

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

  const handleSaveRole = async (userId: string) => {
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
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
        setNewRoles(prev => {
          const newState = { ...prev }
          delete newState[userId]
          return newState
        })
      } else {
        const err = await res.json()
        alert(err.error || "Помилка оновлення ролі")
      }
    } catch (error) {
      alert("Сталася помилка")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCreateUser = async () => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        const newUser = await res.json()
        setUsers([...users, newUser].sort((a, b) => a.fullName.localeCompare(b.fullName)))
        setIsCreateOpen(false)
        setFormData({ email: '', password: '', fullName: '', role: 'EMPLOYEE' })
      } else {
        const err = await res.json()
        alert(err.error || "Помилка створення")
      }
    } catch (error) {
      alert("Помилка створення")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цього користувача? Це незворотня дія.")) return
    try {
      const res = await fetch(`/api/users?userId=${userId}`, { method: "DELETE" })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        const err = await res.json()
        alert(err.error || "Помилка видалення")
      }
    } catch (error) {
      alert("Помилка видалення")
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, password: newPassword }),
      })
      if (res.ok) {
        alert("Пароль успішно змінено")
        setIsPasswordOpen(false)
        setNewPassword('')
        setSelectedUser(null)
      } else {
        const err = await res.json()
        alert(err.error || "Помилка зміни пароля")
      }
    } catch (error) {
      alert("Помилка зміни пароля")
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
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Додати користувача
          </Button>
        </div>
      )}

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground border-b">
            <tr>
              <th className="p-4 font-medium">ПІБ</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Поточна роль</th>
              <th className="p-4 font-medium">Нова роль</th>
              <th className="p-4 font-medium w-32 text-center">Дії</th>
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
                  <td className="p-4 flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant={hasChanged ? "default" : "secondary"}
                      disabled={isSelf || !hasChanged || updatingId === user.id}
                      onClick={() => handleSaveRole(user.id)}
                    >
                      {updatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Зберегти"}
                    </Button>
                    
                    {isAdmin && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <div className="hover:bg-muted p-1 rounded-md cursor-pointer inline-flex items-center justify-center w-8 h-8">
                            <MoreVertical className="w-4 h-4" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsPasswordOpen(true); }}>
                            <Key className="w-4 h-4 mr-2" /> Змінити пароль
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Модалка створення */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Додати локального користувача</DialogTitle>
            <DialogDescription>
              Створіть нового користувача для доступу до системи.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email (Логін)</Label>
              <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="user@company.com" />
            </div>
            <div className="space-y-2">
              <Label>ПІБ</Label>
              <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Іванов Іван" />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="password" />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={formData.role} onValueChange={role => setFormData({...formData, role: role || 'EMPLOYEE'})}>
                <SelectTrigger>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Скасувати</Button>
            <Button onClick={handleCreateUser}>Створити</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модалка зміни пароля */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Зміна пароля</DialogTitle>
            <DialogDescription>
              Встановіть новий пароль для користувача {selectedUser?.fullName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Новий пароль</Label>
              <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Введіть новий пароль" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPasswordOpen(false); setNewPassword(''); }}>Скасувати</Button>
            <Button onClick={handleChangePassword}>Зберегти пароль</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
