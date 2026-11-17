'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { useMutation } from 'convex/react';
import { PlusIcon, XIcon } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeSwitch } from '@/components/theme-switch';
import { Wordmark } from '@/components/wordmark';
import { HomeDemo } from '@/components/home-demo';
import { HeroActions } from '@/components/hero-actions';
import { markCreated } from '@/components/chart/share';
import {
  readRecent,
  recentSnapshot,
  recordRecent,
  removeRecent,
  subscribeRecent,
} from '@/lib/recent';
function randomKey() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
function openedLabel(opened: number) {
  const minutes = Math.round((Date.now() - opened) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 7) return relative.format(-days, 'day');
  const date = new Date(opened);
  return `on ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  })}`;
}
export function Home() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribeRecent, recentSnapshot, () => '[]');
  const recent = snapshot === '[]' ? [] : readRecent();
  const [creating, setCreating] = useState(false),
    [error, setError] = useState('');
  const create = useMutation(api.charts.write);
  return (
    <main className="home-page">
      <header className="chart-topbar">
        <Wordmark />
        <ThemeSwitch />
      </header>
      <section className="home-hero">
        <div className="home-hero-copy">
          <h1>
            One Gantt chart <span>for you and your agents.</span>
          </h1>
          <p>
            Drag a Task, ask Claude to move the rest, let ChatGPT add the Milestones. Everyone edits
            the same live Chart, and every change is a Revision you can undo. No sign-up, just a
            link.
          </p>
          <small className="home-hero-note">
            Works with Claude, ChatGPT, Cursor and any MCP client.
          </small>
          <HeroActions />
        </div>
        <HomeDemo />
      </section>
      <section className="home-recent" aria-labelledby="home-recent-title">
        <div className="home-recent-head">
          <div>
            <h2 id="home-recent-title">Recent Charts</h2>
            <p>Saved in this browser</p>
          </div>
          <Button
            size="lg"
            className="pl-2.5 pr-3.5"
            disabled={creating}
            onClick={event => {
              const trusted = event.nativeEvent.isTrusted;
              setCreating(true);
              setError('');
              const key = randomKey(),
                viewKey = randomKey();
              void create({
                key,
                kind: trusted ? 'Manual' : 'Agent (Bridge)',
                ...(!trusted ? { client: 'Browser agent' } : {}),
                create: { viewKey, title: 'Untitled Chart' },
              })
                .then(result => {
                  if (!result.ok) throw new Error(result.reasons.join('; '));
                  recordRecent({
                    key,
                    title: 'Untitled Chart',
                    opened: Date.now(),
                    access: 'Edit',
                  });
                  markCreated(key);
                  router.push(`/c/${key}`);
                })
                .catch(error => {
                  setError(error.message);
                  setCreating(false);
                });
            }}
          >
            <PlusIcon />
            {creating ? 'Creating…' : 'New Chart'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {recent.length ? (
          <ul>
            {recent.map(chart => {
              const title = chart.title || 'Untitled Chart';
              return (
                <li key={chart.key}>
                  <Link href={`/${chart.access === 'Edit' ? 'c' : 'v'}/${chart.key}`}>
                    <strong>{title}</strong>
                    <span>
                      <span className="home-recent-access" data-access={chart.access}>
                        {chart.access === 'Edit' ? 'Can edit' : 'View only'}
                      </span>
                      Opened {openedLabel(chart.opened)}
                    </span>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="home-recent-remove text-muted-foreground"
                          aria-label={`Remove ${title} from list`}
                          onClick={() => removeRecent(chart.key)}
                        />
                      }
                    >
                      <XIcon />
                    </TooltipTrigger>
                    <TooltipContent>Remove from list</TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="home-empty">
            <p>No Charts yet.</p>
            <small>Charts you create or open appear here, in this browser only.</small>
          </div>
        )}
      </section>
    </main>
  );
}
