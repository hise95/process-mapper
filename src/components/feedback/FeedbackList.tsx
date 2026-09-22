'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ROLES_UA } from '@/lib/enums';

export default function FeedbackList({ initialFeedbacks }: { initialFeedbacks: any[] }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleResolve = async (id: string) => {
    setProcessingId(id);
    try {
      const adminComment = comments[id] || '';
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED', adminComment })
      });

      if (res.ok) {
        const updated = await res.json();
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: 'RESOLVED', adminComment } : f));
        router.refresh();
      } else {
        alert('Помилка при опрацюванні звернення');
      }
    } catch (err) {
      console.error(err);
      alert('Помилка мережі');
    } finally {
      setProcessingId(null);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'БАГ': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'ПРОПОЗИЦІЯ': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'ПИТАННЯ': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {feedbacks.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">Немає звернень</h3>
            <p className="text-muted-foreground text-sm mt-1">Усі проблеми вирішені! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        feedbacks.map(f => (
          <Card key={f.id} className={f.status === 'RESOLVED' ? 'opacity-70 bg-muted/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className={getBadgeColor(f.type)}>{f.type}</Badge>
                    {f.status === 'RESOLVED' && <Badge variant="default" className="bg-emerald-600">Опрацьовано</Badge>}
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(f.createdAt).toLocaleString('uk-UA')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Від:</span>
                    <span className="font-medium">{f.user.fullName}</span>
                    <span className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md">
                      {ROLES_UA[f.user.role] || f.user.role}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-md p-3 border border-border text-sm mb-4 whitespace-pre-wrap">
                {f.message}
              </div>

              {f.status === 'OPEN' ? (
                <div className="space-y-3">
                  <Textarea 
                    placeholder="Ваш коментар для користувача (необов'язково)..."
                    value={comments[f.id] || ''}
                    onChange={(e) => setComments({ ...comments, [f.id]: e.target.value })}
                    className="text-sm min-h-[80px]"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleResolve(f.id)} 
                      disabled={processingId === f.id}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {processingId === f.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Позначити як опрацьоване
                    </Button>
                  </div>
                </div>
              ) : (
                f.adminComment && (
                  <div className="bg-primary/5 rounded-md p-3 border border-primary/20 text-sm mt-4">
                    <span className="font-semibold text-primary">Ваш коментар:</span>
                    <p className="mt-1 whitespace-pre-wrap">{f.adminComment}</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
