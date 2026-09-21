import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">Завантаження...</p>
    </div>
  )
}
