'use client';
import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
const swap = 'transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]';
export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 1600); return () => clearTimeout(timer); }, [copied]);
  return <Button variant="outline" size="sm" className={cn('pl-2', className)} disabled={!value} onClick={() => { void navigator.clipboard.writeText(value).then(() => setCopied(true)); }}>
    <span className="relative size-3.5">
      <CheckIcon className={cn('absolute inset-0 size-3.5', swap, copied ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]')} />
      <CopyIcon className={cn('absolute inset-0 size-3.5', swap, copied ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-0')} />
    </span>
    <span aria-live="polite">{copied ? 'Copied' : label}</span>
  </Button>;
}
