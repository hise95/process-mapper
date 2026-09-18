'use client';

import React, { useState, useEffect } from 'react';
import { ArchitectureCard, ArchitectureData, initialArchitectureData } from '@/lib/architectureData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Plus, RotateCcw, Download, Check, Loader2, Search } from 'lucide-react';

interface ArchitectureViewProps {
  session: any;
}

export function ArchitectureView({ session }: ArchitectureViewProps) {
  const [data, setData] = useState<ArchitectureData>(initialArchitectureData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Фільтрація та пошук
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mgmt' | 'main' | 'supp'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Стан для модального вікна редагування
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);

  // Поля форми
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formGroup, setFormGroup] = useState<'mgmt' | 'main' | 'supp'>('main');
  const [formInputs, setFormInputs] = useState('');
  const [formOutputs, setFormOutputs] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const STORAGE_KEY = 'kopiyochka_architecture_data_v2';

  // Завантаження даних
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Спочатку перевіряємо локальне сховище браузера для миттєвого збереження стану
      let localData: ArchitectureData | null = null;
      try {
        const localRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (localRaw) {
          localData = JSON.parse(localRaw);
          if (localData && Array.isArray(localData.cards) && localData.cards.length > 0) {
            setData(localData);
          }
        }
      } catch (err) {
        console.error('Помилка читання localStorage', err);
      }

      // 2. Отримуємо актуальні дані з сервера
      const res = await fetch('/api/architecture', { cache: 'no-store' });
      if (res.ok) {
        const serverData: ArchitectureData = await res.json();
        
        // Якщо в браузері ще не було збережених даних, беремо з сервера
        if (!localData) {
          setData(serverData);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
          }
        } else if (serverData.cards && serverData.cards.length > localData.cards.length) {
          // Якщо на сервері більше карток, оновлюємо локальні дані
          setData(serverData);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
          }
        } else if (localData && localData.cards.length >= serverData.cards.length) {
          // Якщо в користувача в браузері збережені новіші або відредаговані дані,
          // відправляємо їх на сервер у фоні для постійної синхронізації
          fetch('/api/architecture', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localData),
          }).catch(console.error);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Збереження даних
  const persistData = async (newData: ArchitectureData) => {
    setData(newData);

    // 1. Негайний запис у localStorage — гарантує, що при оновленні сторінки (F5) нічого не зникне!
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      } catch (e) {
        console.error('Помилка збереження в localStorage', e);
      }
    }

    // 2. Синхронізація з сервером
    try {
      setSaving(true);
      const res = await fetch('/api/architecture', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      if (res.ok) {
        showToast('Зміни успішно збережено');
      } else {
        showToast('Збережено локально');
      }
    } catch (e) {
      console.error(e);
      showToast('Збережено в браузері');
    } finally {
      setSaving(false);
    }
  };

  // Відкриття модалки редагування/створення
  const handleOpenModal = (cardId: string | null, defaultGroup: 'mgmt' | 'main' | 'supp' = 'main') => {
    if (cardId) {
      const card = data.cards.find(c => c.id === cardId);
      if (card) {
        setCurrentCardId(card.id);
        setFormCode(card.code);
        setFormTitle(card.title);
        setFormOwner(card.owner);
        setFormGroup(card.group);
        setFormInputs(card.inputs.join('\n'));
        setFormOutputs(card.outputs.join('\n'));
        setIsModalOpen(true);
      }
    } else {
      setCurrentCardId(null);
      setFormCode('');
      setFormTitle('');
      setFormOwner('');
      setFormGroup(defaultGroup);
      setFormInputs('');
      setFormOutputs('');
      setIsModalOpen(true);
    }
  };

  // Збереження з форми
  const handleSaveCard = () => {
    const parseLines = (text: string) =>
      text
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

    const updatedInputs = parseLines(formInputs);
    const updatedOutputs = parseLines(formOutputs);

    if (currentCardId) {
      const updatedCards = data.cards.map(card => {
        if (card.id === currentCardId) {
          return {
            ...card,
            code: formCode.trim() || '—',
            title: formTitle.trim() || 'Без назви',
            owner: formOwner.trim() || '—',
            group: formGroup,
            inputs: updatedInputs,
            outputs: updatedOutputs,
          };
        }
        return card;
      });
      persistData({ ...data, cards: updatedCards });
    } else {
      const newCard: ArchitectureCard = {
        id: 'p_' + Math.random().toString(36).slice(2, 9),
        code: formCode.trim() || '—',
        title: formTitle.trim() || 'Новий процес',
        owner: formOwner.trim() || '—',
        group: formGroup,
        inputs: updatedInputs,
        outputs: updatedOutputs,
      };
      persistData({ ...data, cards: [...data.cards, newCard] });
    }

    setIsModalOpen(false);
  };

  // Видалення картки
  const handleDeleteCard = () => {
    if (!currentCardId) return;
    if (!confirm('Видалити цю картку процесу з архітектури?')) return;

    const filtered = data.cards.filter(c => c.id !== currentCardId);
    persistData({ ...data, cards: filtered });
    setIsModalOpen(false);
    showToast('Картку видалено');
  };

  // Скидання до початкового стану
  const handleResetToSeed = async () => {
    if (!confirm('Скинути всю архітектуру до початкового стану з файлу?')) return;
    try {
      setSaving(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      const res = await fetch('/api/architecture', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
        }
        showToast('Архітектуру відновлено до початкового стану');
      } else {
        setData(initialArchitectureData);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initialArchitectureData));
        }
        showToast('Архітектуру відновлено');
      }
    } catch (e) {
      setData(initialArchitectureData);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialArchitectureData));
      }
      showToast('Архітектуру відновлено');
    } finally {
      setSaving(false);
    }
  };

  // Експорт у JSON / HTML
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture_kopiyochka_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON файл завантажено');
  };

  // Рендер посилань [B.01] або [→ B.03]
  const renderTextWithTags = (text: string) => {
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const content = part.slice(1, -1);
        return (
          <span
            key={i}
            className="inline-block text-[10px] font-bold bg-muted text-foreground/80 border border-border/80 rounded px-1.5 py-0.5 ml-1 align-baseline select-none"
          >
            {content}
          </span>
        );
      }
      return part;
    });
  };

  const matchesSearch = (card: ArchitectureCard) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      card.code.toLowerCase().includes(q) ||
      card.title.toLowerCase().includes(q) ||
      card.owner.toLowerCase().includes(q) ||
      card.inputs.some(inp => inp.toLowerCase().includes(q)) ||
      card.outputs.some(out => out.toLowerCase().includes(q))
    );
  };

  const totalMgmt = data.cards.filter(c => c.group === 'mgmt').length;
  const totalMain = data.cards.filter(c => c.group === 'main').length;
  const totalSupp = data.cards.filter(c => c.group === 'supp').length;

  const mgmtCards = data.cards.filter(c => c.group === 'mgmt' && matchesSearch(c));
  const mainCards = data.cards.filter(c => c.group === 'main' && matchesSearch(c));
  const suppCards = data.cards.filter(c => c.group === 'supp' && matchesSearch(c));
  const totalFilteredCount = mgmtCards.length + mainCards.length + suppCards.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Завантаження архітектури процесів...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Верхня панель управління архітектурою */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span>Архітектура бізнес-процесів Копійочка</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              Рівень L1
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Комплексна карта взаємозв’язків, входів та виходів процесів компанії.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isEditingMode ? 'default' : 'outline'}
            onClick={() => setIsEditingMode(!isEditingMode)}
            className={`gap-1.5 font-semibold text-xs h-9 ${
              isEditingMode
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 border-none shadow-sm'
                : 'border-border'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isEditingMode ? 'Вимкнути редагування' : 'Швидке редагування'}</span>
          </Button>

          {isEditingMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToSeed}
                disabled={saving}
                className="text-xs h-9 gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                title="Повернути початковий вміст"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Скинути</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="text-xs h-9 gap-1"
                title="Завантажити копію архітектури"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Експорт</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Панель інтерактивних фільтрів та пошуку */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-card border border-border rounded-xl shadow-xs">
        {/* Фільтри типів процесу */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold mr-1">
            Тип процесу:
          </span>
          
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedFilter === 'all'
                ? 'bg-foreground text-background border-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border-border'
            }`}
          >
            <span>Всі</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background/20 font-extrabold">
              {data.cards.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter(selectedFilter === 'mgmt' ? 'all' : 'mgmt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              selectedFilter === 'mgmt'
                ? 'bg-[#FFC10D] text-slate-900 border-[#FFC10D] ring-2 ring-[#FFC10D]/40 shadow-xs'
                : 'bg-muted/60 text-foreground hover:bg-muted border-border'
            }`}
            title="Показати лише управлінські процеси"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFC10D] shrink-0" />
            <span>Управлінський (M)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-extrabold">
              {totalMgmt}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter(selectedFilter === 'main' ? 'all' : 'main')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              selectedFilter === 'main'
                ? 'bg-[#E8401A] text-white border-[#E8401A] ring-2 ring-[#E8401A]/40 shadow-xs'
                : 'bg-muted/60 text-foreground hover:bg-muted border-border'
            }`}
            title="Показати лише основні процеси"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8401A] shrink-0" />
            <span>Основний (B)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-extrabold">
              {totalMain}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter(selectedFilter === 'supp' ? 'all' : 'supp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              selectedFilter === 'supp'
                ? 'bg-[#3D3D3D] text-[#FFC10D] border-[#FFC10D]/50 ring-2 ring-[#FFC10D]/30 shadow-xs'
                : 'bg-muted/60 text-foreground hover:bg-muted border-border'
            }`}
            title="Показати лише сервісні процеси"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#3D3D3D] dark:bg-[#777] shrink-0" />
            <span>Сервісний (S)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-extrabold">
              {totalSupp}
            </span>
          </button>
        </div>

        {/* Швидкий пошук та легенда міток */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Пошук (назва, код, власник)..."
              className="pl-8 pr-7 h-8 text-xs bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-border hidden md:block" />

          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500 shrink-0" />
              <span className="text-[11px]">Вхід</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500 shrink-0" />
              <span className="text-[11px]">Вихід</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-normal">
              <span className="font-bold text-foreground bg-muted border border-border px-1 py-0.5 rounded text-[10px]">
                B.01
              </span>
              <span>= лінк</span>
            </div>
          </div>
        </div>
      </div>

      {/* Якщо нічого не знайдено через пошук */}
      {totalFilteredCount === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl bg-card/50">
          <p className="text-sm font-semibold text-foreground">Процесів за запитом &quot;{searchQuery}&quot; не знайдено</p>
          <p className="text-xs text-muted-foreground mt-1">Спробуйте змінити пошуковий запит або скинути фільтри.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="mt-4 text-xs"
          >
            Скинути пошук та фільтри
          </Button>
        </div>
      )}

      {/* 1. БЛОК УПРАВЛІНСЬКИХ ПРОЦЕСІВ (M) */}
      {(selectedFilter === 'all' || selectedFilter === 'mgmt') && (mgmtCards.length > 0 || isEditingMode || !searchQuery) && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFC10D] text-slate-900 font-bold text-xs tracking-wider uppercase">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-[#FFC10D] flex items-center justify-center font-black text-xs">
                M
              </span>
              <span>Управлінські процеси ({mgmtCards.length})</span>
            </div>
            <div className="flex-1 h-0.5 bg-gradient-to-r from-[#FFC10D] to-transparent opacity-40 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {mgmtCards.map(card => (
              <CardItem
                key={card.id}
                card={card}
                isEditingMode={isEditingMode}
                onEdit={() => handleOpenModal(card.id, 'mgmt')}
                renderTags={renderTextWithTags}
              />
            ))}
            {isEditingMode && (
              <button
                onClick={() => handleOpenModal(null, 'mgmt')}
                className="border-2 border-dashed border-border hover:border-[#FFC10D] rounded-xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[#FFC10D] transition-colors group cursor-pointer bg-card/40"
              >
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">+ Додати управлінський процес</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 2. БЛОК ОСНОВНИХ ПРОЦЕСІВ (B) */}
      {(selectedFilter === 'all' || selectedFilter === 'main') && (mainCards.length > 0 || isEditingMode || !searchQuery) && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8401A] text-white font-bold text-xs tracking-wider uppercase">
              <span className="w-5 h-5 rounded-full bg-[#FFC10D] text-[#E8401A] flex items-center justify-center font-black text-xs">
                B
              </span>
              <span>Основні процеси ({mainCards.length})</span>
            </div>
            <div className="flex-1 h-0.5 bg-gradient-to-r from-[#E8401A] to-transparent opacity-40 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {mainCards.map(card => (
              <CardItem
                key={card.id}
                card={card}
                isEditingMode={isEditingMode}
                onEdit={() => handleOpenModal(card.id, 'main')}
                renderTags={renderTextWithTags}
              />
            ))}
            {isEditingMode && (
              <button
                onClick={() => handleOpenModal(null, 'main')}
                className="border-2 border-dashed border-border hover:border-[#E8401A] rounded-xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-[#E8401A] transition-colors group cursor-pointer bg-card/40"
              >
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">+ Додати основний процес</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 3. БЛОК СЕРВІСНИХ ПРОЦЕСІВ (S) */}
      {(selectedFilter === 'all' || selectedFilter === 'supp') && (suppCards.length > 0 || isEditingMode || !searchQuery) && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3D3D3D] dark:bg-[#2a2a2a] text-[#FFC10D] font-bold text-xs tracking-wider uppercase border border-border">
              <span className="w-5 h-5 rounded-full bg-[#FFC10D] text-slate-900 flex items-center justify-center font-black text-xs">
                S
              </span>
              <span>Сервісні процеси ({suppCards.length})</span>
            </div>
            <div className="flex-1 h-0.5 bg-gradient-to-r from-[#3D3D3D] dark:from-[#555] to-transparent opacity-40 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {suppCards.map(card => (
              <CardItem
                key={card.id}
                card={card}
                isEditingMode={isEditingMode}
                onEdit={() => handleOpenModal(card.id, 'supp')}
                renderTags={renderTextWithTags}
              />
            ))}
            {isEditingMode && (
              <button
                onClick={() => handleOpenModal(null, 'supp')}
                className="border-2 border-dashed border-border hover:border-[#3D3D3D] rounded-xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer bg-card/40"
              >
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">+ Додати сервісний процес</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Підвал зі статистикою */}
      <div className="pt-6 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted-foreground">
        <div>
          Всього процесів в архітектурі: <span className="font-bold text-foreground">{data.cards.length}</span> (M: {mgmtCards.length}, B: {mainCards.length}, S: {suppCards.length})
        </div>
        <div>
          Редакція: v.02.03 · Статус: Робоча архітектура L1
        </div>
      </div>

      {/* Модальне вікно редагування */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentCardId ? 'Редагування картки процесу' : 'Створення нового процесу'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-bold">Код</Label>
                <Input
                  id="code"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="B.01 або S.04"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold">Назва процесу</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Вкажіть точну назву процесу"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Блок (Група процесу)</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormGroup('mgmt')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    formGroup === 'mgmt'
                      ? 'bg-[#FFC10D] text-slate-900 border-[#FFC10D] shadow-sm ring-2 ring-[#FFC10D]/40'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 shrink-0" />
                  <span className="truncate">M (Управлінський)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormGroup('main')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    formGroup === 'main'
                      ? 'bg-[#E8401A] text-white border-[#E8401A] shadow-sm ring-2 ring-[#E8401A]/40'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">B (Основний)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormGroup('supp')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    formGroup === 'supp'
                      ? 'bg-[#3D3D3D] text-[#FFC10D] border-neutral-600 shadow-sm ring-2 ring-[#FFC10D]/30'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFC10D] shrink-0" />
                  <span className="truncate">S (Сервісний)</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="owner" className="text-xs font-bold">Власник процесу</Label>
              <Input
                id="owner"
                value={formOwner}
                onChange={e => setFormOwner(e.target.value)}
                placeholder="Посада відповідального (напр. Генеральний директор)"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inputs" className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Вхід (по одному пункту в рядку)
              </Label>
              <Textarea
                id="inputs"
                rows={4}
                value={formInputs}
                onChange={e => setFormInputs(e.target.value)}
                placeholder="Вхідний документ або стан&#10;Дані покупок [B.05]"
                className="font-sans text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outputs" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Вихід (по одному пункту в рядку)
              </Label>
              <Textarea
                id="outputs"
                rows={4}
                value={formOutputs}
                onChange={e => setFormOutputs(e.target.value)}
                placeholder="Результат процесу&#10;Затверджений асортимент [→ B.03]"
                className="font-sans text-xs resize-none"
              />
            </div>

            <div className="p-3 bg-muted/60 border border-border rounded-lg text-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">Підказка:</span>
              <p>
                Посилання на інший процес беріть у квадратні дужки: наприклад <code className="text-foreground bg-muted px-1 rounded">[B.05]</code> або <code className="text-foreground bg-muted px-1 rounded">[→ B.03]</code> — вони автоматично перетворяться на акуратні мітки.
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center w-full sm:justify-between pt-2">
            {currentCardId ? (
              <Button variant="destructive" size="sm" onClick={handleDeleteCard} type="button">
                Видалити
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} type="button">
                Скасувати
              </Button>
              <Button size="sm" onClick={handleSaveCard} type="button" className="bg-primary text-primary-foreground font-semibold">
                Зберегти
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Спливаючий Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background font-semibold text-xs px-4 py-2 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// Окремий компонент картки процесу
interface CardItemProps {
  card: ArchitectureCard;
  isEditingMode: boolean;
  onEdit: () => void;
  renderTags: (text: string) => React.ReactNode;
}

function CardItem({ card, isEditingMode, onEdit, renderTags }: CardItemProps) {
  const getTopStripColor = (group: string) => {
    switch (group) {
      case 'mgmt':
        return 'bg-[#FFC10D]';
      case 'main':
        return 'bg-[#E8401A]';
      case 'supp':
      default:
        return 'bg-[#3D3D3D] dark:bg-[#777]';
    }
  };

  const getBadgeStyle = (group: string) => {
    switch (group) {
      case 'mgmt':
        return 'bg-[#FFC10D] text-slate-900';
      case 'main':
        return 'bg-[#E8401A] text-white';
      case 'supp':
      default:
        return 'bg-[#3D3D3D] text-[#FFC10D] dark:bg-[#444] dark:text-[#FFC10D]';
    }
  };

  const getOwnerDotColor = (group: string) => {
    switch (group) {
      case 'mgmt':
        return 'bg-[#FFC10D]';
      case 'main':
        return 'bg-[#E8401A]';
      case 'supp':
      default:
        return 'bg-[#3D3D3D] dark:bg-[#888]';
    }
  };

  return (
    <div className="group/card relative flex flex-col rounded-xl overflow-hidden border border-border bg-card shadow-xs hover:shadow-md transition-all">
      {/* Кнопка редагування картки в режимі редагування */}
      {isEditingMode && (
        <button
          onClick={onEdit}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-background/90 text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer border border-border"
          title="Редагувати картку"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Верхня кольорова смужка */}
      <div className={`h-1.5 w-full ${getTopStripColor(card.group)}`} />

      {/* Шапка картки */}
      <div className="p-3.5 flex items-start gap-3 border-b border-border bg-card">
        <div className={`shrink-0 px-2 py-1 rounded-md font-bold text-xs ${getBadgeStyle(card.group)} shadow-xs`}>
          {card.code}
        </div>
        <h4 className="font-bold text-sm leading-snug text-foreground flex-1 pr-5">
          {card.title}
        </h4>
      </div>

      {/* Власник процесу */}
      <div className="px-3.5 py-2 text-[11px] font-semibold text-muted-foreground bg-muted/30 border-b border-border flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${getOwnerDotColor(card.group)}`} />
        <span className="truncate">{card.owner}</span>
      </div>

      {/* Входи та Виходи (2 колонки) */}
      <div className="grid grid-cols-2 divide-x divide-border flex-1 text-xs">
        {/* Вхід */}
        <div className="p-3 space-y-2 flex flex-col">
          <div className="font-bold text-[10px] tracking-wider uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-black">
              →
            </span>
            <span>Вхід</span>
          </div>

          <ul className="space-y-1.5 flex-1">
            {card.inputs.length === 0 ? (
              <li className="text-[11px] text-muted-foreground/60 italic">—</li>
            ) : (
              card.inputs.map((inp, idx) => (
                <li
                  key={idx}
                  className="text-[11px] leading-tight p-1.5 rounded-md bg-blue-50/70 dark:bg-blue-950/40 border-l-2 border-blue-500 text-foreground"
                >
                  {renderTags(inp)}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Вихід */}
        <div className="p-3 space-y-2 flex flex-col">
          <div className="font-bold text-[10px] tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[9px] font-black">
              ←
            </span>
            <span>Вихід</span>
          </div>

          <ul className="space-y-1.5 flex-1">
            {card.outputs.length === 0 ? (
              <li className="text-[11px] text-muted-foreground/60 italic">—</li>
            ) : (
              card.outputs.map((out, idx) => (
                <li
                  key={idx}
                  className="text-[11px] leading-tight p-1.5 rounded-md bg-emerald-50/70 dark:bg-emerald-950/40 border-l-2 border-emerald-500 text-foreground"
                >
                  {renderTags(out)}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
