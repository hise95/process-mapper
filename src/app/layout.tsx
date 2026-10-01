// src/app/layout.tsx
import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const roboto = Roboto({ subsets: ['latin', 'cyrillic'], weight: ['300', '400', '500', '700', '900'] })

export const metadata: Metadata = {
  title: 'BeeProcess',
  description: 'Внутрішня система управління та картографування бізнес-процесів',
  robots: 'noindex, nofollow',
}

import Sidebar from '@/components/layout/Sidebar';
import { ClientLayoutWrapper } from '@/components/layout/ClientLayoutWrapper';

import { getSession } from '@/lib/auth';

import { ThemeProvider } from '@/components/ThemeProvider';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  const isEmployee = session?.role === 'EMPLOYEE';

  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${roboto.className} antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <ClientLayoutWrapper sidebar={!isEmployee ? <Sidebar /> : null} isEmployee={isEmployee} user={session}>
              {children}
            </ClientLayoutWrapper>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
