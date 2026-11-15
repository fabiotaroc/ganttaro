'use client';
import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { Share2Icon } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CopyButton } from '@/components/copy-button';
const created = 'ganttaro:created';
export function markCreated(key: string) {
  sessionStorage.setItem(created, key);
}
export function Share({ chartKey }: { chartKey: string }) {
  const viewKey = useQuery(api.charts.viewKey, { key: chartKey });
  // Only rendered after the Chart loads in the browser, so window globals are available here.
  const [open, setOpen] = useState(() => sessionStorage.getItem(created) === chartKey);
  const origin = location.origin;
  useEffect(() => {
    if (sessionStorage.getItem(created) === chartKey) sessionStorage.removeItem(created);
  }, [chartKey]);
  const links = [
    { name: 'Edit Link', hint: 'Can change the Chart', value: `${origin}/c/${chartKey}` },
    { name: 'View Link', hint: 'Can only look', value: viewKey ? `${origin}/v/${viewKey}` : '' },
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" className="pl-2" />}>
        <Share2Icon />
        Share
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="share-popover w-80 gap-0 p-0">
        <div className="px-4 pt-4 pb-3">
          <PopoverTitle className="text-sm font-semibold">Share this Chart</PopoverTitle>
          <PopoverDescription className="mt-1 text-xs text-pretty text-muted-foreground">
            There are no accounts. Whoever has a link can open the Chart.
          </PopoverDescription>
        </div>
        <ul className="border-t">
          {links.map(link => (
            <li
              key={link.name}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{link.name}</p>
                <p className="truncate text-xs text-muted-foreground">{link.hint}</p>
              </div>
              <CopyButton value={link.value} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
