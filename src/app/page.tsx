// src/app/page.tsx
// Головна сторінка — перенаправлення на дашборд або логін
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
