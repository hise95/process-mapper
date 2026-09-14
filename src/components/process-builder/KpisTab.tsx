'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function KpisTab({ processId, initialKpis }: { processId: string, initialKpis: any[] }) {
  const [kpis, setKpis] = useState(initialKpis);

  const handleAdd = () => {
    const newKpi = { id: `temp-${Date.now()}`, name: '', unit: '', source: '', frequency: '', target: '' };
    setKpis([...kpis, newKpi]);
  };

  const handleUpdate = (id: string, field: string, value: string) => {
    setKpis(kpis.map(k => k.id === id ? { ...k, [field]: value } : k));
  };

  const handleBlur = async () => {
    await fetch(`/api/processes/${processId}/kpis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kpis }),
    });
  };

  const handleDelete = async (id: string) => {
    const newKpis = kpis.filter(k => k.id !== id);
    setKpis(newKpis);
    await fetch(`/api/processes/${processId}/kpis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kpis: newKpis }),
    });
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Назва показника</TableHead>
            <TableHead>Одиниця виміру</TableHead>
            <TableHead>Джерело</TableHead>
            <TableHead>Частота вимірювання</TableHead>
            <TableHead>Цільове значення / KPI</TableHead>
            <TableHead>Дії</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kpis.map(kpi => (
            <TableRow key={kpi.id}>
              <TableCell><Input value={kpi.name} onChange={e => handleUpdate(kpi.id, 'name', e.target.value)} onBlur={handleBlur} /></TableCell>
              <TableCell><Input value={kpi.unit} onChange={e => handleUpdate(kpi.id, 'unit', e.target.value)} onBlur={handleBlur} /></TableCell>
              <TableCell><Input value={kpi.source} onChange={e => handleUpdate(kpi.id, 'source', e.target.value)} onBlur={handleBlur} /></TableCell>
              <TableCell><Input value={kpi.frequency} onChange={e => handleUpdate(kpi.id, 'frequency', e.target.value)} onBlur={handleBlur} /></TableCell>
              <TableCell><Input value={kpi.target} onChange={e => handleUpdate(kpi.id, 'target', e.target.value)} onBlur={handleBlur} /></TableCell>
              <TableCell>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(kpi.id)}>Видалити</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={handleAdd}>Додати показник</Button>
    </div>
  );
}
