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
import { SlidersHorizontal, RotateCcw, Settings, Filter, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { SessionUser } from '@/lib/types';
import { PROCESS_TYPE_LABELS } from '@/lib/enums';

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
  { id: 'status',      label: 'Статус',       defaultWidth: 200, minWidth: 150, canHide: true },
  { id: 'updatedAt',   label: 'Оновлено',     defaultWidth: 110, minWidth: 80,  canHide: true },
  { id: 'actions',     label: 'Дії',          defaultWidth: 220, minWidth: 200, canHide: false },
];

const DEFAULT_ORDER = ALL_COLUMNS.map(c => c.id);
const DEFAULT_VISIBLE = ALL_COLUMNS.map(c => c.id);
const DEFAULT_WIDTHS: Record<string, number> = ALL_COLUMNS.reduce((acc, c) => {
  acc[c.id] = c.defaultWidth;
  return acc;
}, {} as Record<string, number>);

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  DRAFT:                   { label: 'Чернетка (Паспорт)',       variant: 'secondary' },
  PASSPORT_REVIEW_ANALYST: { label: 'Паспорт: Перевірка А.',    variant: 'outline' },
  PASSPORT_REVIEW_OWNER:   { label: 'Паспорт: Погодження В.',   variant: 'outline' },
  STEPS_DRAFT:             { label: 'Чернетка (Кроки)',         variant: 'secondary' },
  STEPS_REVIEW_ANALYST:    { label: 'Кроки: Перевірка А.',      variant: 'outline' },
  STEPS_REVIEW_OWNER:      { label: 'Кроки: Погодження В.',     variant: 'outline' },
  KPIS_DRAFT:              { label: 'Чернетка (Показники)',     variant: 'secondary' },
  KPIS_REVIEW_ANALYST:     { label: 'Показники: Перевірка А.',  variant: 'outline' },
  KPIS_REVIEW_OWNER:       { label: 'Показники: Погодження В.', variant: 'outline' },
  FINAL_APPROVAL_ANALYST:  { label: 'Фінальне затвердження',    variant: 'outline' },
  APPROVED:                { label: 'Затверджено',              variant: 'default' },
  ARCHIVED:                { label: 'В архіві',                 variant: 'secondary' },
};

const STORAGE_KEY = 'process_mapper_table_settings_v2';

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

  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const ITEMS_PER_PAGE = 15;

  const filteredProcesses = processes.filter(p => {
    if (query && !(
      p.title.toLowerCase().includes(query) ||
      (p.code && p.code.toLowerCase().includes(query)) ||
      (p.manager?.fullName && p.manager.fullName.toLowerCase().includes(query)) ||
      (p.owner?.fullName && p.owner.fullName.toLowerCase().includes(query))
    )) {
      return false;
    }
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && p.processType !== typeFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProcesses.length / ITEMS_PER_PAGE);
  const paginatedProcesses = filteredProcesses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, typeFilter]);

  // Відновлення з localStorage після монтування
  // eslint-disable-next-line
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

    // eslint-disable-next-line
    document.body.style.cursor = 'col-resize';
    // eslint-disable-next-line
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

  const totalTableWidth = orderedVisibleColumns.reduce((sum, col) => sum + (columnWidths[col.id] || col.defaultWidth), 0);

  // Рендеринг вмісту клітинки
  const renderCellContent = (colId: string, process: ProcessTableRow) => {
    switch (colId) {
      case 'code':
        return (
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-muted">
            {process.code || '—'}
          </Badge>
        );
      case 'title':
        return (
          <span className="font-semibold text-foreground block truncate" title={process.title}>
            {process.title}
          </span>
        );
      case 'processType': {
        const typeLabel = process.processType ? (PROCESS_TYPE_LABELS[process.processType] || process.processType) : '—';
        return <span className="text-xs text-muted-foreground font-medium">{typeLabel}</span>;
      }
      case 'level':
        return <span className="text-xs text-muted-foreground">{process.level?.name || '—'}</span>;
      case 'manager':
        return <span className="text-xs text-foreground/80">{process.manager?.fullName || '—'}</span>;
      case 'owner':
        return <span className="text-xs text-foreground/80">{process.owner?.fullName || '—'}</span>;
      case 'status': {
        const cfg = STATUS_CONFIG[process.status] ?? { label: process.status, variant: 'secondary' as const };
        return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
      }
      case 'updatedAt':
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
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
            {(session.role === 'ADMIN' || session.role === 'PROCESS_ANALYST' || process.managerId === session.id || process.ownerId === session.id) && (
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
    <div className="space-y-4">
      {/* Таблиця */}
      <div className="rounded-xl border border-border shadow-sm bg-card overflow-x-auto">
        <Table className="w-full table-fixed" style={{ minWidth: totalTableWidth }}>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b border-border select-none">
              {orderedVisibleColumns.map((col, index) => {
                const width = columnWidths[col.id] || col.defaultWidth;

                return (
                  <TableHead
                    key={col.id}
                    style={{ width: `${width}px`, minWidth: `${col.minWidth}px` }}
                    className="relative p-3 font-bold text-xs uppercase tracking-wider text-muted-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1 overflow-hidden pr-2">
                      {index === 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground focus-visible:ring-0 mr-1 shrink-0 -ml-1">
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                          } />
                          <DropdownMenuContent align="start" className="w-56 bg-popover p-1.5 shadow-lg border border-border rounded-lg">
                            <div className="text-xs font-bold text-foreground px-2 py-1.5">
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
                                  className="text-xs py-1.5 px-2 cursor-pointer rounded hover:bg-muted data-[disabled]:opacity-40"
                                >
                                  {c.label} {!c.canHide && <span className="text-[10px] text-muted-foreground ml-1">(обов'язкова)</span>}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </div>

                            <DropdownMenuSeparator className="my-1" />
                            <div className="p-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={resetToDefault}
                                className="w-full h-7 text-xs text-muted-foreground hover:text-foreground justify-start gap-1 px-2"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Скинути налаштування</span>
                              </Button>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <span className="truncate">{col.label}</span>

                      {(col.id === 'status' || col.id === 'processType') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className={`h-5 w-5 focus-visible:ring-0 ml-auto shrink-0 ${(col.id === 'status' ? statusFilter !== 'ALL' : typeFilter !== 'ALL') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                              <Filter className="w-3 h-3" />
                            </Button>
                          } />
                          <DropdownMenuContent align="start" className="w-56 bg-popover p-1.5 shadow-lg border border-border rounded-lg">
                            <div className="text-xs font-bold text-foreground px-2 py-1.5">
                              Фільтр: {col.label}
                            </div>
                            <DropdownMenuSeparator className="my-1" />
                            <div className="max-h-60 overflow-y-auto space-y-0.5">
                              <DropdownMenuCheckboxItem
                                checked={col.id === 'status' ? statusFilter === 'ALL' : typeFilter === 'ALL'}
                                onCheckedChange={() => col.id === 'status' ? setStatusFilter('ALL') : setTypeFilter('ALL')}
                                className="text-xs py-1.5 px-2 cursor-pointer rounded hover:bg-muted"
                              >
                                Всі {col.id === 'status' ? 'статуси' : 'типи'}
                              </DropdownMenuCheckboxItem>
                              {col.id === 'status' ? (
                                Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                  <DropdownMenuCheckboxItem
                                    key={key}
                                    checked={statusFilter === key}
                                    onCheckedChange={() => setStatusFilter(statusFilter === key ? 'ALL' : key)}
                                    className="text-xs py-1.5 px-2 cursor-pointer rounded hover:bg-muted"
                                  >
                                    {cfg.label}
                                  </DropdownMenuCheckboxItem>
                                ))
                              ) : (
                                ['MANAGERIAL', 'MAIN', 'SERVICE'].map((key) => (
                                  <DropdownMenuCheckboxItem
                                    key={key}
                                    checked={typeFilter === key}
                                    onCheckedChange={() => setTypeFilter(typeFilter === key ? 'ALL' : key)}
                                    className="text-xs py-1.5 px-2 cursor-pointer rounded hover:bg-muted"
                                  >
                                    {PROCESS_TYPE_LABELS[key as keyof typeof PROCESS_TYPE_LABELS]}
                                  </DropdownMenuCheckboxItem>
                                ))
                              )}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Ручка для зміни ширини колонки (Resizer) */}
                    <div
                      onMouseDown={(e) => startResize(col.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary active:bg-primary z-10 transition-colors"
                      title="Потягніть, щоб змінити ширину колонки"
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedProcesses.map((process) => (
              <TableRow key={process.id} className="hover:bg-muted/30 transition-colors">
                {orderedVisibleColumns.map(col => {
                  const width = columnWidths[col.id] || col.defaultWidth;
                  return (
                    <TableCell
                      key={col.id}
                      style={{ width: `${width}px` }}
                      className="p-3 text-sm border-b border-border/50 truncate"
                    >
                      {renderCellContent(col.id, process)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {paginatedProcesses.length === 0 && (
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

      {totalPages > 1 && (
        <div className="flex justify-between items-center py-3 px-4 mt-2 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-border mx-3"></div>
            
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  if (currentPage <= 3) {
                    pages.push(1, 2, 3, 4, '...', totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                  }
                }
                return pages.map((p, i) => {
                  if (p === '...') {
                    return <span key={i} className="px-2 text-muted-foreground">...</span>;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-8 h-8 flex items-center justify-center text-sm transition-colors ${currentPage === p ? 'text-primary border-b-2 border-primary font-bold' : 'text-muted-foreground hover:text-foreground hover:bg-muted rounded'}`}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
            </div>

            <div className="w-px h-6 bg-border mx-3"></div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm text-muted-foreground">
            Показано від {((currentPage - 1) * ITEMS_PER_PAGE) + 1} до {Math.min(currentPage * ITEMS_PER_PAGE, filteredProcesses.length)} з {filteredProcesses.length}
          </div>
        </div>
      )}
    </div>
  );
}
