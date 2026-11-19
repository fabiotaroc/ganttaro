import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppPreferences } from '@/components/app-preferences';
import { DataProvider } from '@/components/convex-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Loading } from '@/components/wordmark';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ganttaro',
  description: 'Shared Charts for people and agents',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-color-scheme="system"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppPreferences>
          <Suspense fallback={<Loading label="Opening Ganttaro…" />}>
            <DataProvider>
              <TooltipProvider delay={300}>{children}</TooltipProvider>
            </DataProvider>
          </Suspense>
        </AppPreferences>
        <Analytics />
      </body>
    </html>
  );
}
