'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  CalendarCheckIcon,
  CircleAlertIcon,
  DownloadIcon,
  EyeIcon,
  HistoryIcon,
  ListOrderedIcon,
  PlusIcon,
  Redo2Icon,
  Settings2Icon,
  Undo2Icon,
  XIcon,
} from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import usePresence from '@convex-dev/presence/react';
import { Gantt, type EditDetails } from '@ganttaro/chart';
import {
  addDays,
  applyChanges,
  columnWidth,
  compact,
  endOf,
  fromCompact,
  generateId,
  nextWorkingDay,
  palette,
  startOf,
  type Change,
  type Chart,
  type CompactChart,
  type Group,
  type Zoom,
} from '@ganttaro/core';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CopyButton } from '@/components/copy-button';
import { Loading, Wordmark } from '@/components/wordmark';
import { recordRecent } from '@/lib/recent';
import { Share } from './share';
import { Shortcuts } from './shortcuts';
import { Revisions } from './revisions';
import { ensureBridgeApproval } from './approval';
import { AgentBridge } from './agent-bridge';
import { Details, type EventEdit } from './details';
export function ChartPage({ chartKey, readOnly }: { chartKey: string; readOnly: boolean }) {
  const data = useQuery(api.charts.get, { key: chartKey, full: true });
  if (!data) return <Loading label="Opening Chart…" />;
  return <LoadedChart initial={data} chartKey={chartKey} readOnly={readOnly} />;
}
function LoadedChart({
  initial,
  chartKey,
  readOnly,
}: {
  initial: CompactChart;
  chartKey: string;
  readOnly: boolean;
}) {
  const chart = fromCompact(initial);
  const opened = useRef<number | null>(null);
  useEffect(() => {
    opened.current ??= Date.now();
    recordRecent({
      key: chartKey,
      title: chart.title,
      access: readOnly ? 'View' : 'Edit',
      opened: opened.current,
    });
  }, [chartKey, chart.title, readOnly]);
  const [zoom, setZoom] = useState<Zoom>(chart.zoom);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'create' | 'settings' | 'history' | null>(null);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [undo, setUndo] = useState<Id<'revisions'>[]>([]),
    [redo, setRedo] = useState<Id<'revisions'>[]>([]);
  const [person] = useState(() => `Person ${crypto.randomUUID().slice(0, 4)}`);
  const presence = usePresence(api.presence, chartKey, person);
  const history = useQuery(api.charts.history, { key: chartKey });
  const mutation = useMutation(api.charts.write).withOptimisticUpdate((store, args) => {
    if (!args.changes) return;
    const old = store.getQuery(api.charts.get, { key: chartKey, full: true });
    if (!old) return;
    const next = applyChanges(fromCompact(old), args.changes as Change[]);
    if (next.ok)
      store.setQuery(api.charts.get, { key: chartKey, full: true }, compact(next.chart, true));
  });
  const report = (text: string) =>
    setMessage(
      chart.items.reduce(
        (value, item) => value.replaceAll(`${item.id}:`, `${item.name || 'Unnamed Item'}:`),
        text,
      ),
    );
  async function write(changes: Change[], details: EditDetails) {
    if (readOnly) throw new Error('A View Link cannot edit');
    const validation = applyChanges(chart, changes);
    if (!validation.ok) throw new Error(validation.reasons.join('; '));
    const manual = ['pointer', 'keyboard', 'mouse', 'touch', 'pen', 'virtual'].includes(
      details.source,
    );
    if (!manual && changes.some(change => change.type === 'delete'))
      await ensureBridgeApproval('remove');
    const result = await mutation({
      key: chartKey,
      kind: manual ? 'Manual' : 'Agent (Bridge)',
      ...(manual ? {} : { client: 'Browser agent' }),
      changes,
    });
    if (!result.ok) throw new Error(result.reasons.join('; '));
    setUndo(value => [...value, result.revisionId]);
    setRedo([]);
    setMessage('');
    return result;
  }
  const edit: EventEdit = async (changes, event) => {
    try {
      await write(changes, {
        source: event.nativeEvent.isTrusted ? 'pointer' : 'programmatic',
        reason: 'form',
      });
      return true;
    } catch (error) {
      report(error instanceof Error ? error.message : String(error));
      return false;
    }
  };
  async function restore(id: string, inverse = false, bridge = false) {
    if (readOnly) throw new Error('A View Link cannot edit');
    if (bridge) await ensureBridgeApproval('restore_revision');
    const result = await mutation({
      key: chartKey,
      kind: bridge ? 'Agent (Bridge)' : 'Manual',
      ...(bridge ? { client: 'Browser agent' } : {}),
      restore: id as Id<'revisions'>,
      versions: chart.items.map(item => ({ id: item.id, version: item.version })),
      inverse,
    });
    if (!result.ok) throw new Error(result.reasons.join('; '));
    setMessage('');
    return result;
  }
  useEffect(() => {
    const id = location.hash.replace('#item-', '');
    if (id)
      document.getElementById(`item-${id}`)?.scrollIntoView({ block: 'center', inline: 'center' });
  }, []);
  const first = chart.items.map(startOf).sort()[0] ?? new Date().toISOString().slice(0, 10);
  const last = chart.items.map(endOf).sort().at(-1) ?? addDays(first, 30);
  const [frame, setFrame] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFrame(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Extend the timeline so it always fills the frame, whatever the zoom.
  const start = addDays(first, -7);
  const filled = addDays(
    start,
    Math.ceil(((Math.max(0, frame - 256) / columnWidth[zoom]) * 7) / 5) + 7,
  );
  const end = [addDays(last, 21), filled].sort().at(-1)!;
  const item = chart.items.find(item => item.id === selected);
  const online = presence?.filter(person => person.online) ?? [];
  const chartUrl = location.href.split('#')[0];
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  function undoLast(bridge: boolean) {
    const id = undo.at(-1);
    if (!id) return;
    void restore(id, true, bridge)
      .then(() => {
        setUndo(value => value.slice(0, -1));
        setRedo(value => [...value, id]);
      })
      .catch(error => report(error.message));
  }
  function redoLast(bridge: boolean) {
    const id = redo.at(-1);
    if (!id) return;
    void restore(id, false, bridge)
      .then(() => {
        setRedo(value => value.slice(0, -1));
        setUndo(value => [...value, id]);
      })
      .catch(error => report(error.message));
  }
  function scrollToToday() {
    const scroller = document.querySelector<HTMLElement>('.gantt-scroll'),
      line = document.querySelector<HTMLElement>('.gantt-columns > [data-today]');
    if (scroller && line)
      scroller.scrollTo({
        left: Math.max(0, line.offsetLeft - 120),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
  }
  const keys = useRef({ undoLast, redoLast, scrollToToday });
  useEffect(() => {
    keys.current = { undoLast, redoLast, scrollToToday };
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target.closest('input, textarea, select, [contenteditable], [role=dialog]') ||
        event.defaultPrevented
      )
        return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z' && !readOnly) {
        event.preventDefault();
        if (event.shiftKey) keys.current.redoLast(false);
        else keys.current.undoLast(false);
        return;
      }
      if (mod || event.altKey) return;
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(open => !open);
      } else if (target.closest('.gantt')) return;
      else if (event.key.toLowerCase() === 'n' && !readOnly) {
        event.preventDefault();
        setDialog('create');
      } else if (event.key.toLowerCase() === 't') {
        event.preventDefault();
        keys.current.scrollToToday();
      }
    }
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [readOnly]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 8000);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <main className="chart-page">
      <AgentBridge />
      <header className="chart-topbar">
        <Wordmark />
        <div className="ml-auto flex items-center gap-3">
          <Presence people={online.map(person => person.userId)} me={person} />
          {readOnly ? (
            <>
              <Badge variant="secondary">
                <EyeIcon />
                View only
              </Badge>
              <CopyButton value={chartUrl} label="Copy link" />
            </>
          ) : (
            <Share chartKey={chartKey} />
          )}
        </div>
      </header>
      <section className="chart-intro">
        <div className="min-w-0 flex-1">
          <h1>
            {readOnly && !chart.title ? (
              'Untitled Chart'
            ) : (
              <InlineText
                value={chart.title}
                readOnly={readOnly}
                label="Chart title"
                placeholder="Untitled Chart"
                className="chart-title"
                onSave={(title, event) => void edit([{ type: 'chart', fields: { title } }], event)}
              />
            )}
          </h1>
          <InlineText
            value={chart.description ?? ''}
            readOnly={readOnly}
            multiline
            label="Chart description"
            placeholder="Add a description"
            className="chart-description"
            onSave={(description, event) =>
              void edit([{ type: 'chart', fields: { description } }], event)
            }
          />
        </div>
        {!readOnly && (
          <div className="chart-actions">
            <Button variant="outline" className="pl-2" onClick={() => setDialog('settings')}>
              <Settings2Icon />
              Settings
            </Button>
            <Button className="pl-2" onClick={() => setDialog('create')}>
              <PlusIcon />
              New Item
            </Button>
          </div>
        )}
      </section>
      <section className="chart-toolbar">
        <div className="flex items-center gap-2">
          <div className="zoom-control" role="group" aria-label="Zoom">
            {(['days', 'weeks', 'months'] as const).map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={zoom === value}
                onClick={() => setZoom(value)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <Hint label="Scroll to today (T)">
            <Button variant="ghost" size="sm" className="pl-1.5" onClick={scrollToToday}>
              <CalendarCheckIcon />
              Today
            </Button>
          </Hint>
          {!readOnly && zoom !== chart.zoom && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={event => void edit([{ type: 'chart', fields: { zoom } }], event)}
            >
              Make {zoom} the default
            </Button>
          )}
        </div>
        <div className="chart-actions">
          {!readOnly && (
            <>
              <div className="flex items-center">
                <Hint label={`Undo (${mac ? '⌘' : 'Ctrl+'}Z)`}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Undo"
                    disabled={!undo.length}
                    onClick={event => undoLast(!event.nativeEvent.isTrusted)}
                  >
                    <Undo2Icon />
                  </Button>
                </Hint>
                <Hint label={`Redo (${mac ? '⌘⇧' : 'Ctrl+Shift+'}Z)`}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Redo"
                    disabled={!redo.length}
                    onClick={event => redoLast(!event.nativeEvent.isTrusted)}
                  >
                    <Redo2Icon />
                  </Button>
                </Hint>
              </div>
              <span className="toolbar-divider" aria-hidden="true" />
              <Hint label="Reorder Items by start date">
                <Button
                  variant="ghost"
                  size="sm"
                  className="pl-1.5"
                  onClick={event => void edit([{ type: 'tidy' }], event)}
                >
                  <ListOrderedIcon />
                  Tidy
                </Button>
              </Hint>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="pl-1.5"
            aria-pressed={dialog === 'history'}
            onClick={() => setDialog(dialog === 'history' ? null : 'history')}
          >
            <HistoryIcon />
            Revisions
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="pl-1.5" disabled={exporting} />}
            >
              <DownloadIcon />
              {exporting ? 'Exporting…' : 'Export'}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {(['pdf', 'png'] as const).map(format => (
                <DropdownMenuItem
                  key={format}
                  onClick={() => {
                    setExporting(true);
                    void import('@/lib/export')
                      .then(module => module.exportChart(chart, format))
                      .catch(error => report(error.message))
                      .finally(() => setExporting(false));
                  }}
                >
                  {format.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="toolbar-divider" aria-hidden="true" />
          <Shortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} readOnly={readOnly} />
        </div>
      </section>
      <div ref={frameRef}>
        <Gantt
          chart={{ ...chart, zoom }}
          start={start}
          end={end}
          readOnly={readOnly}
          empty={
            readOnly ? (
              <p>This Chart has no Items yet.</p>
            ) : (
              <div className="grid justify-items-start gap-3">
                <div>
                  <p className="font-medium text-foreground">No Items yet</p>
                  <p>Add a Task or a Milestone to start the timeline.</p>
                </div>
                <Button size="sm" className="pl-2" onClick={() => setDialog('create')}>
                  <PlusIcon />
                  New Item
                </Button>
              </div>
            )
          }
          onEdit={write}
          onOpen={setSelected}
          onError={report}
          onRestore={id => restore(id, false, true)}
          onHistory={() => history ?? []}
          onHoliday={(date, event) => {
            void edit(
              [
                {
                  type: 'holidays',
                  dates: chart.holidays.includes(date)
                    ? chart.holidays.filter(value => value !== date)
                    : [...chart.holidays, date],
                },
              ],
              event,
            );
          }}
          onDisconnect={(id, after, event) => {
            const item = chart.items.find(value => value.id === id)!;
            void edit(
              [
                {
                  type: 'update',
                  id,
                  version: item.version,
                  fields: { after: item.after?.filter(value => value !== after) },
                },
              ],
              event,
            );
          }}
        />
      </div>
      <footer className="chart-footer">
        <span className="tabular-nums">
          {count(chart.items.length, 'Item')} · {count(chart.groups.length, 'Group')} ·{' '}
          <span data-conflicts={initial.conflicts.length > 0 || undefined}>
            {count(initial.conflicts.length, 'Conflict')}
          </span>
        </span>
        <Legend groups={chart.groups} />
      </footer>
      {message && (
        <div className="chart-toast" role="alert">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1 text-pretty">{message}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss"
            onClick={() => setMessage('')}
          >
            <XIcon />
          </Button>
        </div>
      )}
      {item && (
        <Details
          key={item.id}
          chart={chart}
          item={item}
          readOnly={readOnly}
          onClose={() => setSelected(null)}
          edit={edit}
        />
      )}
      <Dialog
        open={dialog === 'create'}
        onOpenChange={open => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogTitle>New Item</DialogTitle>
          <DialogDescription>Add a Task or Milestone to this Chart.</DialogDescription>
          <NewItem chart={chart} edit={edit} close={() => setDialog(null)} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialog === 'settings'}
        onOpenChange={open => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
          <DialogTitle>Chart settings</DialogTitle>
          <DialogDescription>Title, description, Holidays and Groups.</DialogDescription>
          <Settings chart={chart} edit={edit} close={() => setDialog(null)} />
        </DialogContent>
      </Dialog>
      <Revisions
        open={dialog === 'history'}
        onOpenChange={open => setDialog(open ? 'history' : null)}
        history={history}
        chart={chart}
        readOnly={readOnly}
        onRestore={(id, event) => {
          void restore(id, false, !event.nativeEvent.isTrusted)
            .then(result => {
              setUndo(value => [...value, result.revisionId]);
              setRedo([]);
            })
            .catch(error => report(error.message));
        }}
      />
    </main>
  );
}
const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
// Always editable in place: the field looks like the text, so nothing shifts on click.
function InlineText({
  value,
  readOnly,
  multiline,
  label,
  placeholder,
  className,
  onSave,
}: {
  value: string;
  readOnly: boolean;
  multiline?: boolean;
  label: string;
  placeholder: string;
  className: string;
  onSave: (value: string, event: { nativeEvent: Event }) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  // Follow other people's edits unless this field is being edited.
  if (!focused && draft !== value) setDraft(value);
  useEffect(() => {
    const el = ref.current;
    if (!multiline || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, multiline]);
  if (readOnly) return value ? <span className={className}>{value}</span> : null;
  const Field = multiline ? 'textarea' : 'input';
  return (
    <Field
      ref={ref}
      className={`inline-text ${className}`}
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      rows={multiline ? 1 : undefined}
      spellCheck={false}
      onChange={event => setDraft(event.currentTarget.value)}
      onFocus={() => setFocused(true)}
      onBlur={event => {
        setFocused(false);
        const next = draft.trim();
        if (next !== value && (next || multiline)) onSave(next, event);
        else setDraft(value);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          setDraft(value);
          // Blur after the revert renders, so the old value is what gets compared.
          requestAnimationFrame(() => ref.current?.blur());
        } else if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
function ColorName({ color }: { color: Group['color'] }) {
  return (
    <span className="flex items-center gap-2">
      <span className="group-swatch" data-group={color} aria-hidden="true" />
      {color[0].toUpperCase() + color.slice(1)}
    </span>
  );
}
function Legend({ groups }: { groups: Group[] }) {
  if (!groups.length) return null;
  return (
    <ul className="chart-legend" aria-label="Groups">
      {groups.map(group => (
        <li key={group.id}>
          <span className="group-swatch" data-group={group.color} aria-hidden="true" />
          {group.name}
        </li>
      ))}
    </ul>
  );
}
function count(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}
function Hint({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
const tints = ['#5368d9', '#2f8f7d', '#c06a2b', '#a2457a', '#6b55b8', '#3b7bbf'];
function Presence({ people, me }: { people: string[]; me: string }) {
  if (!people.length) return null;
  const shown = people.slice(0, 4);
  return (
    <div className="presence" aria-label={`${people.length} here now`}>
      {shown.map(id => {
        const tint =
          tints[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tints.length];
        return (
          <Hint key={id} label={id === me ? `${id} (you)` : id}>
            <span className="presence-avatar" style={{ background: tint }}>
              {id.replace('Person ', '').slice(0, 2).toUpperCase()}
            </span>
          </Hint>
        );
      })}
      {people.length > shown.length && (
        <span className="presence-avatar presence-more">+{people.length - shown.length}</span>
      )}
    </div>
  );
}
function NewItem({ chart, edit, close }: { chart: Chart; edit: EventEdit; close: () => void }) {
  const [milestone, setMilestone] = useState(false);
  const today = nextWorkingDay(new Date().toISOString().slice(0, 10), chart.holidays, true);
  return (
    <form
      className="grid gap-4"
      onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget),
          name = String(form.get('name')),
          start = String(form.get('start'));
        const item = milestone
          ? { name, on: start }
          : { name, start, end: String(form.get('end')) };
        const index = chart.items.findIndex(value => startOf(value) > start);
        void edit(
          [{ type: 'add', item, index: index < 0 ? chart.items.length : index }],
          event,
        ).then(ok => {
          if (ok) close();
        });
      }}
    >
      <div>
        <Label htmlFor="new-name">Name</Label>
        <Input id="new-name" name="name" autoFocus />
      </div>
      <div>
        <Label>Kind</Label>
        <Select
          value={milestone ? 'Milestone' : 'Task'}
          onValueChange={value => setMilestone(value === 'Milestone')}
        >
          <SelectTrigger aria-label="Item kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Task">Task</SelectItem>
            <SelectItem value="Milestone">Milestone</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="new-start">{milestone ? 'Date' : 'Start'}</Label>
        <Input id="new-start" name="start" type="date" defaultValue={today} required />
      </div>
      {!milestone && (
        <div>
          <Label htmlFor="new-end">End</Label>
          <Input id="new-end" name="end" type="date" defaultValue={today} required />
        </div>
      )}
      <Button type="submit">Add Item</Button>
    </form>
  );
}
function Settings({ chart, edit, close }: { chart: Chart; edit: EventEdit; close: () => void }) {
  const [groups, setGroups] = useState<Group[]>(chart.groups);
  return (
    <form
      className="grid gap-4"
      onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void edit(
          [
            {
              type: 'chart',
              fields: {
                title: String(data.get('title')),
                description: String(data.get('description')),
              },
            },
            {
              type: 'holidays',
              dates: String(data.get('holidays'))
                .split(/[\s,]+/)
                .filter(Boolean),
            },
            { type: 'groups', groups },
          ],
          event,
        ).then(ok => {
          if (ok) close();
        });
      }}
    >
      <div>
        <Label htmlFor="chart-title">Title</Label>
        <Input id="chart-title" name="title" defaultValue={chart.title} />
      </div>
      <div>
        <Label htmlFor="chart-description">Description</Label>
        <Textarea id="chart-description" name="description" defaultValue={chart.description} />
      </div>
      <div>
        <Label htmlFor="chart-holidays">Holidays</Label>
        <Textarea id="chart-holidays" name="holidays" defaultValue={chart.holidays.join('\n')} />
        <p className="text-xs text-muted-foreground">
          Weekday dates, one YYYY-MM-DD per line. Item dates stay as they are.
        </p>
      </div>
      <Label>Groups</Label>
      {groups.length > 0 && (
        <div className="group-row text-xs text-muted-foreground" aria-hidden="true">
          <span>Name</span>
          <span>Colour</span>
        </div>
      )}
      {groups.map((group, index) => (
        <div className="group-row" key={group.id}>
          <Input
            aria-label={`Group name ${index + 1}`}
            value={group.name}
            onChange={event =>
              setGroups(
                groups.map(value =>
                  value.id === group.id ? { ...value, name: event.target.value } : value,
                ),
              )
            }
          />
          <Select
            value={group.color}
            onValueChange={color => {
              if (color)
                setGroups(
                  groups.map(value =>
                    value.id === group.id ? { ...value, color: color as Group['color'] } : value,
                  ),
                );
            }}
          >
            <SelectTrigger className="w-full" aria-label={`Group colour ${index + 1}`}>
              <SelectValue>{(color: Group['color']) => <ColorName color={color} />}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {palette.map(color => (
                <SelectItem key={color} value={color}>
                  <ColorName color={color} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={chart.items.some(item => item.group === group.id)}
            aria-label={`Remove Group ${group.name}`}
            onClick={() => setGroups(groups.filter(value => value.id !== group.id))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setGroups([
            ...groups,
            {
              id: generateId(
                'group',
                groups.map(value => value.id),
              ),
              name: 'New Group',
              color: palette[groups.length % palette.length],
            },
          ])
        }
      >
        Add Group
      </Button>
      <Button type="submit">Save settings</Button>
    </form>
  );
}
