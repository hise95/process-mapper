// src/app/layout.tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const geist = Geist({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Process Mapper AS-IS',
  description: 'Внутрішня система управління та картографування бізнес-процесів',
  robots: 'noindex, nofollow',
}

import Sidebar from '@/components/layout/Sidebar';
import { ClientLayoutWrapper } from '@/components/layout/ClientLayoutWrapper';

import { getSession } from '@/lib/auth';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  const isEmployee = session?.role === 'EMPLOYEE';

  return (
    <html lang="uk">
      <body className={`${geist.className} antialiased bg-background text-foreground`}>
        <TooltipProvider>
          <ClientLayoutWrapper sidebar={!isEmployee ? <Sidebar /> : null} isEmployee={isEmployee} user={session}>
            {children}
          </ClientLayoutWrapper>
        </TooltipProvider>
      </body>
    </html>
  )
}
