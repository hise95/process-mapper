// src/app/layout.tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const roboto = localFont({
  src: [
    { path: '../fonts/roboto-300-normal.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/roboto-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/roboto-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/roboto-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/roboto-900-normal.woff2', weight: '900', style: 'normal' },
  ],
  display: 'swap',
})

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
