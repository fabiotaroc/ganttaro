'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto grid min-h-screen max-w-lg content-center gap-5 p-8"><h1 className="text-3xl font-semibold">This Chart could not be opened</h1><p className="text-muted-foreground">Check the Edit Link or View Link and try again.</p><div className="flex gap-3"><Button onClick={reset}>Try again</Button><Button variant="outline" render={<Link href="/" />}>Recent charts</Button></div></main>;
}
