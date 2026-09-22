'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('ПРОПОЗИЦІЯ');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message })
      });

      if (res.ok) {
        setOpen(false);
        setMessage('');
        setType('ПРОПОЗИЦІЯ');
        router.refresh();
      } else {
        alert('Помилка при відправці звернення');
      }
    } catch (err) {
      console.error(err);
      alert('Помилка мережі');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
        <MessageSquarePlus className="w-4 h-4 mr-2" />
        Написати звернення
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">Написати звернення</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Знайшли баг або маєте пропозицію щодо покращення системи? Напишіть нам!
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Тип звернення</label>
              <Select value={type} onValueChange={(val) => setType(val || 'ПРОПОЗИЦІЯ')}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue>
                  {type === 'ПРОПОЗИЦІЯ' ? '💡 Пропозиція' : type === 'БАГ' ? '🐛 Помилка (Баг)' : '❓ Запитання'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ПРОПОЗИЦІЯ" className="py-3 text-base">💡 Пропозиція</SelectItem>
                <SelectItem value="БАГ" className="py-3 text-base">🐛 Помилка (Баг)</SelectItem>
                <SelectItem value="ПИТАННЯ" className="py-3 text-base">❓ Запитання</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">Ваше повідомлення</label>
            <Textarea 
              placeholder="Опишіть вашу ідею або проблему..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="min-h-[200px] text-base resize-y"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mr-2">
              Скасувати
            </Button>
            <Button type="submit" disabled={loading || !message.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Надіслати
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
