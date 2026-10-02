'use client';

import { useState, useRef } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SortableRow({ step, onUpdate, onDelete, readonly }: { step: any, onUpdate: any, onDelete: any, readonly?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell {...attributes} {...listeners} className={readonly ? "text-center opacity-50" : "cursor-grab text-center"}>⋮⋮</TableCell>
      <TableCell><Input disabled={readonly} disabled={readonly} value={step.name || ''} onChange={e => onUpdate(step.id, 'name', e.target.value)} /></TableCell>
      <TableCell><Input disabled={readonly} value={step.description || ''} onChange={e => onUpdate(step.id, 'description', e.target.value)} /></TableCell>
      <TableCell><Input disabled={readonly} value={step.executorRole || ''} onChange={e => onUpdate(step.id, 'executorRole', e.target.value)} /></TableCell>
      <TableCell><Input disabled={readonly} value={step.docUrl || ''} onChange={e => onUpdate(step.id, 'docUrl', e.target.value)} placeholder="URL" /></TableCell>
      <TableCell><Input disabled={readonly} value={step.comment || ''} onChange={e => onUpdate(step.id, 'comment', e.target.value)} /></TableCell>
      <TableCell>
        <Button disabled={readonly} variant="destructive" size="sm" onClick={() => onDelete(step.id)}>Видалити</Button>
      </TableCell>
    </TableRow>
  );
}

export default function StepsTab({ processId, initialSteps, readonly = false }: { processId: string, initialSteps: any[], readonly?: boolean }) {
  const [steps, setSteps] = useState(initialSteps);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = steps.findIndex(s => s.id === active.id);
      const newIndex = steps.findIndex(s => s.id === over.id);
      const newSteps = [...steps];
      const [moved] = newSteps.splice(oldIndex, 1);
      newSteps.splice(newIndex, 0, moved);
      const updatedSteps = newSteps.map((s, index) => ({ ...s, orderIndex: index + 1 }));
      setSteps(updatedSteps);
      
      await fetch(`/api/processes/${processId}/steps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSteps),
      });
    }
  };

  const handleAdd = async () => {
    const res = await fetch(`/api/processes/${processId}/steps`, { method: 'POST' });
    if (res.ok) {
      const newStep = await res.json();
      setSteps([...steps, newStep]);
    }
  };

  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleUpdate = (id: string, field: string, value: string) => {
    // Оновлюємо стан негайно (UI відчуття швидкості)
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

    // Дебounced збереження в БД
    const timerKey = `${id}-${field}`;
    if (saveTimers.current[timerKey]) clearTimeout(saveTimers.current[timerKey]);
    saveTimers.current[timerKey] = setTimeout(async () => {
      await fetch(`/api/processes/${processId}/steps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    }, 600);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/processes/${processId}/steps/${id}`, { method: 'DELETE' });
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Назва кроку</TableHead>
              <TableHead>Опис (що зробити)</TableHead>
              <TableHead>Хто виконує</TableHead>
              <TableHead>Шаблон документу</TableHead>
              <TableHead>Коментар</TableHead>
              <TableHead>Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {steps.map(step => (
                <SortableRow key={step.id} step={step} onUpdate={handleUpdate} onDelete={handleDelete} readonly={readonly} />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>
      {!readonly && <Button onClick={handleAdd}>Додати крок</Button>}
    </div>
  );
}
