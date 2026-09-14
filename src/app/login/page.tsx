'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Помилка входу')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Помилка мережі. Спробуйте знову.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Process Mapper</h1>
          <p className="text-slate-500 mt-2">Авторизація в системі</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center mb-6 border border-red-200">
            {error}
          </div>
        )}

        <Card className="shadow-lg border-0 ring-1 ring-slate-200">
          <CardContent className="pt-8 pb-8 px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email адреса</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-[#fa4616]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-slate-50 focus-visible:ring-[#fa4616]"
                />
              </div>

              <Button type="submit" className="w-full bg-[#fa4616] hover:bg-[#d93a10] text-white py-6 text-lg mt-2 shadow-md transition-all" disabled={loading}>
                {loading ? 'Зачекайте...' : 'Увійти'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-slate-500 bg-white p-4 rounded-xl border">
          <p className="font-semibold mb-2">Демонстраційні акаунти (пароль: password123):</p>
          <ul className="text-xs space-y-1">
            <li><strong>Адміністратор:</strong> admin@company.com</li>
            <li><strong>Аналітик:</strong> analyst@company.com</li>
            <li><strong>Власник:</strong> owner@company.com</li>
            <li><strong>Менеджер:</strong> manager@company.com</li>
            <li><strong>Працівник:</strong> employee@company.com</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
