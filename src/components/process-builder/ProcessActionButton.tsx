'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ProcessActionButtonProps {
  label: string;
  url: string;
  body: Record<string, unknown>;
  method: string;
  onSuccess?: () => void;
  className?: string;
}

export function ProcessActionButton({
  label,
  url,
  body,
  method,
  onSuccess,
  className = '',
}: ProcessActionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка виконання дії');
      }
    } catch {
      alert('Помилка з\'єднання');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} className={className}>
      {loading ? 'Виконання...' : label}
    </Button>
  );
}
