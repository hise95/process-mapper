'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AnalystKanbanBoard({ initialTasks, analysts, currentUser }: any) {
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('none');
  const router = useRouter();

  const handleCreate = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/analyst-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title, 
        description, 
        assigneeId: assigneeId === 'none' ? null : assigneeId 
      })
    });
    if (res.ok) {
      const newTask = await res.json();
      setTasks([newTask, ...tasks]);
      setOpen(false);
      setTitle('');
      setDescription('');
      setAssigneeId('none');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setTasks((prev: any) => prev.map((t: any) => t.id === id ? { ...t, status } : t));
    await fetch(`/api/analyst-tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Видалити задачу?')) return;
    setTasks((prev: any) => prev.filter((t: any) => t.id !== id));
    await fetch(`/api/analyst-tasks/${id}`, { method: 'DELETE' });
  };

  const columns = [
    { id: 'TODO', title: 'До виконання', color: 'border-l-slate-400' },
    { id: 'IN_PROGRESS', title: 'В процесі', color: 'border-l-blue-500' },
    { id: 'DONE', title: 'Готово', color: 'border-l-green-500' }
  ];

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Додати задачу</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[600px] w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-xl">Нова задача</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 mt-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">Короткий заголовок</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 text-base" required />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Опис (необов&apos;язково)</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[150px] text-base resize-y" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Призначити на</label>
                <Select value={assigneeId} onValueChange={(val) => setAssigneeId(val || 'none')}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue>
                      {assigneeId === 'none' 
                        ? 'Не призначено' 
                        : analysts.find((a: any) => a.id === assigneeId)?.fullName || 'Не призначено'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="py-3 text-base">Не призначено</SelectItem>
                    {analysts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id} className="py-3 text-base">{a.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full h-12 text-base">Зберегти</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => {
          const colTasks = tasks.filter((t: any) => t.status === col.id);
          return (
            <div key={col.id} className="bg-muted/30 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{col.title}</h3>
                <span className="bg-muted px-2 py-0.5 rounded-full text-xs">{colTasks.length}</span>
              </div>
              
              <div className="space-y-3">
                {colTasks.map((t: any) => (
                  <Card key={t.id} className={`border-l-4 ${col.color}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm leading-tight">{t.title}</h4>
                        <button onClick={() => deleteTask(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mb-3">{t.description}</p>}
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          <UserIcon className="w-3 h-3 mr-1" />
                          {t.assignee?.fullName || 'Не призначено'}
                        </div>
                        
                        <div className="flex gap-1">
                          <Select value={t.status} onValueChange={(val) => val && updateStatus(t.id, val)}>
                            <SelectTrigger className="h-7 w-28 text-[11px] px-2 border-dashed">
                              <SelectValue>
                                {t.status === 'TODO' ? 'До виконання' : t.status === 'IN_PROGRESS' ? 'В процесі' : 'Готово'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TODO">До виконання</SelectItem>
                              <SelectItem value="IN_PROGRESS">В процесі</SelectItem>
                              <SelectItem value="DONE">Готово</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Створив: {t.author?.fullName || 'Невідомо'}</span>
                        <span>{new Date(t.createdAt).toLocaleDateString('uk-UA')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colTasks.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4 italic">Немає задач</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
