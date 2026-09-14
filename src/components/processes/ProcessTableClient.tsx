'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SlidersHorizontal, RotateCcw, Settings } from 'lucide-react';
import type { SessionUser } from '@/lib/types';

export interface ProcessTableRow {
  id: string;
  code: string | null;
  title: string;
  processType: string;
  status: string;
  managerId: string | null;
  ownerId: string | null;
  updatedAt: string | Date;
  level: { name: string } | null;
  manager: { fullName: string } | null;
  owner: { fullName: string } | null;
}

interface ColumnDef {
  id: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  canHide: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'code',        label: 'Код',          defaultWidth: 100, minWidth: 70,  canHide: true },
  { id: 'title',       label: 'Назва процесу', defaultWidth: 260, minWidth: 140, canHide: false },
  { id: 'processType', label: 'Тип',          defaultWidth: 130, minWidth: 80,  canHide: true },
  { id: 'level',       label: 'Рівень',       defaultWidth: 120, minWidth: 80,  canHide: true },
  { id: 'manager',     label: 'Менеджер',     defaultWidth: 160, minWidth: 100, canHide: true },
  { id: 'owner',       label: 'Власник',      defaultWidth: 160, minWidth: 100, canHide: true },
  { id: 'status',      label: 'Статус',       defaultWidth: 130, minWidth: 90,  canHide: true },
  { id: 'updatedAt',   label: 'Оновлено',     defaultWidth: 110, minWidth: 80,  canHide: true },
  { id: 'actions',     label: 'Дії',          defaultWidth: 180, minWidth: 130, canHide: false },
];

const DEFAULT_ORDER = ALL_COLUMNS.map(c => c.id);
const DEFAULT_VISIBLE = ALL_COLUMNS.map(c => c.id);
const DEFAULT_WIDTHS: Record<string, number> = ALL_COLUMNS.reduce((acc, c) => {
  acc[c.id] = c.defaultWidth;
  return acc;
}, {} as Record<string, number>);

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  DRAFT:              { label: 'Чернетка',         variant: 'secondary' },
  IN_REVIEW_ANALYST:  { label: 'На перевірці',     variant: 'outline'   },
  IN_REVIEW_OWNER:    { label: 'На погодженні',    variant: 'outline'   },
  APPROVED:           { label: 'Затверджено',      variant: 'default'   },
  ARCHIVED:           { label: 'В архіві',         variant: 'secondary' },
};

const STORAGE_KEY = 'process_mapper_table_settings_v1';

import { useSearchParams } from 'next/navigation';

export function ProcessTableClient({
  processes,
  session,
}: {
  processes: ProcessTableRow[];
  session: SessionUser;
}) {
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').toLowerCase();

  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_ORDER);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);

  const filteredProcesses = processes.filter(p => {
    if (!query) return true;
    return (
      p.title.toLowerCase().includes(query) ||
      (p.code && p.code.toLowerCase().includes(query)) ||
      (p.manager?.fullName && p.manager.fullName.toLowerCase().includes(query)) ||
      (p.owner?.fullName && p.owner.fullName.toLowerCase().includes(query))
    );
  });

  // Відновлення з localStorage після монтування
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.columnOrder)) setColumnOrder(parsed.columnOrder);
        if (Array.isArray(parsed.visibleColumns)) setVisibleColumns(parsed.visibleColumns);
        if (parsed.columnWidths && typeof parsed.columnWidths === 'object') {
          setColumnWidths(prev => ({ ...prev, ...parsed.columnWidths }));
        }
      }
    } catch {
      // ігноруємо помилки парсингу
    }
  }, []);

  // Збереження в localStorage
  const saveSettings = (order: string[], visible: string[], widths: Record<string, number>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        columnOrder: order,
        visibleColumns: visible,
        columnWidths: widths,
      }));
    } catch {
      // ігноруємо
    }
  };

  // Скидання до стандартних
  const resetToDefault = () => {
    setColumnOrder(DEFAULT_ORDER);
    setVisibleColumns(DEFAULT_VISIBLE);
    setColumnWidths(DEFAULT_WIDTHS);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Перемикання видимості колонки
  const toggleColumnVisibility = (colId: string) => {
    let next: string[];
    if (visibleColumns.includes(colId)) {
      next = visibleColumns.filter(id => id !== colId);
    } else {
      next = [...visibleColumns, colId];
    }
    setVisibleColumns(next);
    saveSettings(columnOrder, next, columnWidths);
  };

  // ── Column Resizing (зміна розмірів колонок) ──
  const startResize = (colId: string, startEvent: React.MouseEvent) => {
    startEvent.preventDefault();
    startEvent.stopPropagation();

    const startX = startEvent.clientX;
    const initialWidth = columnWidths[colId] || 120;
    const colDef = ALL_COLUMNS.find(c => c.id === colId);
    const minW = colDef?.minWidth || 70;

    document.body.style.cursor = 'col-resize';
    document.body.classList.add('select-none');

    let currentWidth = initialWidth;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      currentWidth = Math.max(minW, initialWidth + deltaX);
      setColumnWidths(prev => ({
        ...prev,
        [colId]: currentWidth,
      }));
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.classList.remove('select-none');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      setColumnWidths(prev => {
        const updated = { ...prev, [colId]: currentWidth };
        saveSettings(columnOrder, visibleColumns, updated);
        return updated;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Активні колонки у правильному порядку
  const orderedVisibleColumns = columnOrder
    .filter(id => visibleColumns.includes(id))
    .map(id => ALL_COLUMNS.find(c => c.id === id)!)
    .filter(Boolean);

  // Рендеринг вмісту клітинки
  const renderCellContent = (colId: string, process: ProcessTableRow) => {
    switch (colId) {
      case 'code':
        return (
          <Badge variant="outline" className="font-mono text-xs text-slate-600 bg-slate-50">
            {process.code || '—'}
          </Badge>
        );
      case 'title':
        return (
          <span className="font-semibold text-slate-900 block truncate" title={process.title}>
            {process.title}
          </span>
        );
      case 'processType':
        return <span className="text-xs text-slate-600 font-medium">{process.processType || '—'}</span>;
      case 'level':
        return <span className="text-xs text-slate-600">{process.level?.name || '—'}</span>;
      case 'manager':
        return <span className="text-xs text-slate-700">{process.manager?.fullName || '—'}</span>;
      case 'owner':
        return <span className="text-xs text-slate-700">{process.owner?.fullName || '—'}</span>;
      case 'status': {
        const cfg = STATUS_CONFIG[process.status] ?? { label: process.status, variant: 'secondary' as const };
        return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
      }
      case 'updatedAt':
        return (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {new Date(process.updatedAt).toLocaleDateString('uk-UA')}
          </span>
        );
      case 'actions':
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Link
              href={`/processes/${process.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' h-7 px-2.5 text-xs'}
            >
              Переглянути
            </Link>
            {(session.role === 'ADMIN_ANALYST' || process.managerId === session.id || process.ownerId === session.id) && (
              <Link
                href={`/processes/${process.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' h-7 px-2.5 text-xs text-[#fa4616] border-orange-200 hover:bg-orange-50'}
              >
                Редагувати
              </Link>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Таблиця */}
      <div className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-slate-50/90 border-b border-slate-200 select-none">
              {orderedVisibleColumns.map((col, index) => {
                const width = columnWidths[col.id] || col.defaultWidth;

                return (
                  <TableHead
                    key={col.id}
                    style={{ width: `${width}px`, minWidth: `${col.minWidth}px` }}
                    className="relative p-3 font-bold text-xs uppercase tracking-wider text-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      {index === 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700 focus-visible:ring-0 mr-1 shrink-0 -ml-1">
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                          } />
                          <DropdownMenuContent align="start" className="w-56 bg-white p-1.5 shadow-lg border border-slate-200 rounded-lg">
                            <div className="text-xs font-bold text-slate-800 px-2 py-1.5">
                              Видимість колонок
                            </div>
                            <DropdownMenuSeparator className="my-1" />
                            
                            <div className="max-h-60 overflow-y-auto space-y-0.5">
                              {ALL_COLUMNS.map(c => (
                                <DropdownMenuCheckboxItem
                                  key={c.id}
                                  checked={visibleColumns.includes(c.id)}
                                  disabled={!c.canHide}
                                  onCheckedChange={() => toggleColumnVisibility(c.id)}
                                  className="text-xs py-1.5 px-2 cursor-pointer rounded hover:bg-slate-100 data-[disabled]:opacity-40"
                                >
                                  {c.label} {!c.canHide && <span className="text-[10px] text-slate-400 ml-1">(обов'язкова)</span>}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </div>

                            <DropdownMenuSeparator className="my-1" />
                            <div className="p-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={resetToDefault}
                                className="w-full h-7 text-xs text-slate-600 hover:text-slate-900 justify-start gap-1 px-2"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Скинути налаштування</span>
                              </Button>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <span className="truncate">{col.label}</span>
                    </div>

                    {/* Ручка для зміни ширини колонки (Resizer) */}
                    <div
                      onMouseDown={(e) => startResize(col.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#fa4616] active:bg-[#fa4616] z-10 transition-colors"
                      title="Потягніть, щоб змінити ширину колонки"
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredProcesses.map((process) => (
              <TableRow key={process.id} className="hover:bg-slate-50/70 transition-colors">
                {orderedVisibleColumns.map(col => {
                  const width = columnWidths[col.id] || col.defaultWidth;
                  return (
                    <TableCell
                      key={col.id}
                      style={{ width: `${width}px` }}
                      className="p-3 text-sm border-b border-slate-100 truncate"
                    >
                      {renderCellContent(col.id, process)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {filteredProcesses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={orderedVisibleColumns.length + 1}
                  className="text-center text-muted-foreground h-32 text-sm"
                >
                  {(session.role === 'PROCESS_MANAGER' || session.role === 'PROCESS_OWNER')
                    ? 'У вас ще немає процесів. Натисніть «+ Створити процес», щоб почати.'
                    : 'Немає процесів для відображення'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
