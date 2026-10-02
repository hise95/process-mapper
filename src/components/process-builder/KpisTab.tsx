'use client';

import { useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function KpisTab({ processId, initialKpis, readonly = false }: { processId: string, initialKpis: any[], readonly?: boolean }) {
  const [kpis, setKpis] = useState(initialKpis);
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleAdd = async () => {
    try {
      const res = await fetch(`/api/processes/${processId}/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Новий показник' }),
      });
      if (res.ok) {
        const newKpi = await res.json();
        setKpis(prev => [...prev, newKpi]);
      }
    } catch (err) {
      console.error('Failed to add KPI', err);
    }
  };

  const handleUpdate = (id: string, field: string, value: string) => {
    // Оптимістичне оновлення стану
    setKpis(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k));

    // Debounced збереження на сервері через PUT (масив)
    const timerKey = `${id}-${field}`;
    if (saveTimers.current[timerKey]) clearTimeout(saveTimers.current[timerKey]);
    saveTimers.current[timerKey] = setTimeout(async () => {
      setKpis(latestKpis => {
        fetch(`/api/processes/${processId}/kpis`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(latestKpis),
        }).catch(err => console.error('Failed to update KPIs', err));
        return latestKpis;
      });
    }, 600);
  };

  const handleDelete = async (id: string) => {
    setKpis(prev => prev.filter(k => k.id !== id));
    try {
      await fetch(`/api/processes/${processId}/kpis`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiId: id }),
      });
    } catch (err) {
      console.error('Failed to delete KPI', err);
    }
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Назва показника</TableHead>
            <TableHead>Одиниці виміру</TableHead>
            <TableHead>Джерело</TableHead>
            <TableHead>Частота вимірювання</TableHead>
            <TableHead>Цільове значення</TableHead>
            <TableHead>Дії</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kpis.map(kpi => (
            <TableRow key={kpi.id}>
              <TableCell>
                <Input disabled={readonly}
                  value={kpi.name || ''}
                  onChange={e => handleUpdate(kpi.id, 'name', e.target.value)}
                  placeholder="Час виконання..."
                />
              </TableCell>
              <TableCell>
                <Input disabled={readonly}
                  value={kpi.unit || ''}
                  onChange={e => handleUpdate(kpi.id, 'unit', e.target.value)}
                  placeholder="дні, год..."
                />
              </TableCell>
              <TableCell>
                <Input disabled={readonly}
                  value={kpi.dataSource || ''}
                  onChange={e => handleUpdate(kpi.id, 'dataSource', e.target.value)}
                  placeholder="ERP, CRM..."
                />
              </TableCell>
              <TableCell>
                <Input disabled={readonly}
                  value={kpi.frequency || ''}
                  onChange={e => handleUpdate(kpi.id, 'frequency', e.target.value)}
                  placeholder="Щомісяця..."
                />
              </TableCell>
              <TableCell>
                <Input disabled={readonly}
                  value={kpi.targetValue || ''}
                  onChange={e => handleUpdate(kpi.id, 'targetValue', e.target.value)}
                  placeholder="< 2 днів..."
                />
              </TableCell>
              <TableCell>
                <Button disabled={readonly} variant="destructive" size="sm" onClick={() => handleDelete(kpi.id)}>
                  Видалити
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!readonly && (
        <Button onClick={handleAdd}>Додати показник процесу</Button>
      )}
    </div>
  );
}
