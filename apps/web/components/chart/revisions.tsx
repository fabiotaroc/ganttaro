'use client';
import type { Chart } from '@ganttaro/core';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
type Diff = {
  target: 'chart' | 'item' | 'group';
  id: string;
  field: string;
  before: unknown;
  after: unknown;
};
export type Revision = {
  id: string;
  timestamp: number;
  kind: string;
  client?: string;
  diffs: Diff[];
};
const kinds: Record<string, string> = {
  Manual: 'Manual Edit',
  'Agent (MCP)': 'Agent Edit (MCP)',
  'Agent (Bridge)': 'Agent Edit (Bridge)',
};
const fieldNames: Record<string, string> = {
  start: 'start',
  end: 'end',
  on: 'date',
  after: 'Dependencies',
  group: 'Group',
  owners: 'Owners',
  links: 'links',
};
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
function summary(diffs: Diff[], chart: Chart) {
  const parts: string[] = [];
  const name = (id: string) => {
    const diff = diffs.find(
      value => value.target === 'item' && value.id === id && value.field === 'name',
    );
    return String(
      diff?.after ?? diff?.before ?? chart.items.find(item => item.id === id)?.name ?? 'an Item',
    );
  };
  const items = [...new Set(diffs.filter(diff => diff.target === 'item').map(diff => diff.id))];
  const added = items.filter(id =>
    diffs.some(diff => diff.id === id && diff.field === 'id' && diff.before === null),
  );
  const removed = items.filter(id =>
    diffs.some(diff => diff.id === id && diff.field === 'id' && diff.after === null),
  );
  const changed = items.filter(id => !added.includes(id) && !removed.includes(id));
  if (added.length)
    parts.push(
      added.length === 1 ? `Added ${name(added[0])}` : `Added ${plural(added.length, 'Item')}`,
    );
  if (removed.length)
    parts.push(
      removed.length === 1
        ? `Removed ${name(removed[0])}`
        : `Removed ${plural(removed.length, 'Item')}`,
    );
  if (changed.length === 1) {
    const fields = diffs
      .filter(diff => diff.id === changed[0] && diff.field !== 'version')
      .map(diff => (diff.field === 'name' ? 'name' : (fieldNames[diff.field] ?? diff.field)));
    if (fields.length)
      parts.push(
        fields.length === 1 && fields[0] === 'name'
          ? `Renamed ${name(changed[0])}`
          : `Changed ${fields.join(', ')} of ${name(changed[0])}`,
      );
  } else if (changed.length) parts.push(`Changed ${plural(changed.length, 'Item')}`);
  const chartFields = diffs.filter(diff => diff.target === 'chart').map(diff => diff.field);
  if (chartFields.includes('title')) parts.push('Renamed the Chart');
  if (chartFields.includes('description')) parts.push('Changed the description');
  if (chartFields.includes('holidays')) parts.push('Changed Holidays');
  if (chartFields.includes('zoom')) parts.push('Changed the default zoom');
  if (chartFields.includes('order') && !added.length && !removed.length)
    parts.push('Reordered Items');
  if (diffs.some(diff => diff.target === 'group')) parts.push('Changed Groups');
  return parts.length ? parts.join(' · ') : 'Saved with no changes';
}
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function ago(timestamp: number) {
  const seconds = (timestamp - Date.now()) / 1000;
  for (const [unit, size] of [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ] as const)
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  return 'just now';
}
export function Revisions({
  open,
  onOpenChange,
  history,
  chart,
  readOnly,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: Revision[] | undefined;
  chart: Chart;
  readOnly: boolean;
  onRestore: (id: string, event: React.MouseEvent) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent showOverlay={false} className="gap-0 p-0 sm:max-w-sm">
        <div className="border-b px-5 pt-5 pb-4">
          <SheetTitle>Revisions</SheetTitle>
        </div>
        <ol className="flex-1 overflow-y-auto px-2 py-2">
          {history?.map((revision, index) => (
            <li key={revision.id} className="revision group/revision">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-pretty">
                  {summary(revision.diffs, chart)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <time
                    dateTime={new Date(revision.timestamp).toISOString()}
                    title={new Date(revision.timestamp).toLocaleString()}
                  >
                    {ago(revision.timestamp)}
                  </time>{' '}
                  · {kinds[revision.kind] ?? revision.kind}
                  {revision.client ? ` · ${revision.client}` : ''}
                </p>
              </div>
              {!readOnly && index > 0 && (
                <Button
                  variant="outline"
                  size="xs"
                  className="opacity-0 group-hover/revision:opacity-100 group-focus-within/revision:opacity-100"
                  onClick={event => onRestore(revision.id, event)}
                >
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
