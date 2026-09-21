'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center space-y-4 p-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Ой! Щось пішло не так</h2>
      <p className="text-muted-foreground max-w-md">
        Сталася непередбачена помилка. Ми вже зберегли інформацію про неї. Будь ласка, спробуйте оновити сторінку.
      </p>
      <div className="flex gap-4 pt-4">
        <Button onClick={() => window.location.reload()} variant="outline">
          Оновити сторінку
        </Button>
        <Button onClick={() => reset()}>
          Спробувати ще раз
        </Button>
      </div>
    </div>
  )
}
