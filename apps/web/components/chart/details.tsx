'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckIcon, CircleAlertIcon, LinkIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import {
  changedBy,
  checkDraft,
  draftNotices,
  draftPatch,
  draftProblems,
  draftValue,
  editDraft,
  emptyDraft,
  takeTheirs,
  type Chart,
  type Change,
  type Draft,
  type DraftField,
  type DraftValues,
  type Item,
  type RevisionSummary,
} from '@ganttaro/core';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
type EditEvent = { nativeEvent: Event };
export type EventEdit = (changes: Change[], event: EditEvent) => Promise<boolean>;
export type SaveEdit = (changes: Change[], event: EditEvent) => Promise<string | null>;
function Header({ chart, item }: { chart: Chart; item: Item }) {
  const group = chart.groups.find(group => group.id === item.group);
  return (
    <header className="flex flex-col gap-2 border-b px-6 pt-6 pb-5 pr-12">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="group-swatch" data-group={group?.color ?? 'indigo'} aria-hidden="true" />
        {group?.name ?? 'No Group'}
        <span aria-hidden="true">·</span>
        {item.on !== undefined ? 'Milestone' : 'Task'}
      </span>
      <SheetTitle className="text-xl font-semibold tracking-tight text-balance">
        {item.name || 'Unnamed Item'}
      </SheetTitle>
    </header>
  );
}
export function Field({
  label,
  htmlFor,
  hint,
  error,
  notice,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {notice}
    </div>
  );
}
function CopyLink({ item }: { item: Item }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        void navigator.clipboard
          .writeText(`${location.origin}${location.pathname}#item-${item.id}`)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
      }}
    >
      {copied ? <CheckIcon aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}
export const footer = 'flex items-center gap-2 border-t bg-popover px-6 py-4';
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
function summarize<F extends DraftField>(chart: Chart, field: F, value: DraftValues[F]): string {
  const v = value as DraftValues[DraftField];
  switch (field) {
    case 'name':
      return v ? `“${v as string}”` : 'an empty name';
    case 'description':
      return v ? `“${(v as string).length > 80 ? `${(v as string).slice(0, 80)}…` : v}”` : 'empty';
    case 'dates': {
      const dates = v as DraftValues['dates'];
      return 'on' in dates
        ? shortDate(dates.on)
        : `${shortDate(dates.start)} – ${shortDate(dates.end)}`;
    }
    case 'group':
      return chart.groups.find(group => group.id === v)?.name ?? 'No Group';
    case 'after':
      return (
        (v as string[])
          .map(id => chart.items.find(item => item.id === id)?.name || 'Unnamed Item')
          .join(', ') || 'nothing'
      );
    default:
      return (v as string[]).join(', ') || 'none';
  }
}
const parse = (text: string, separator: string) =>
  text
    .split(separator)
    .map(value => value.trim())
    .filter(Boolean);
export function Details({
  chart,
  item,
  revisions,
  readOnly,
  onClose,
  save,
  onDelete,
}: {
  chart: Chart;
  item: Item | undefined;
  revisions: readonly RevisionSummary[];
  readOnly: boolean;
  onClose: () => void;
  save: SaveEdit;
  onDelete: (item: Item, event: EditEvent) => Promise<string | null>;
}) {
  // Keep showing the last known Item if someone deletes it while the sheet is open.
  const [last, setLast] = useState(item!);
  if (item && (item.id !== last.id || item.version !== last.version)) setLast(item);
  const current = item ?? last;
  // Your own delete removes the Item before the sheet closes; that is not someone else's.
  const [deleting, setDeleting] = useState(false);
  const gone = !item && !deleting;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [text, setText] = useState<Partial<Record<'owners' | 'links', string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const trusted = useRef<boolean | null>(null);
  const anchor = useComboboxAnchor();
  const patch = draftPatch(draft, current);
  const dirty = Object.keys(patch).length > 0;
  const check = !item ? null : checkDraft(chart, current, patch);
  const server = error ? draftProblems(error.split('; ')) : { fields: {}, other: [] };
  const problems = { ...server.fields, ...check?.fields };
  const other = [...new Set([...(check?.other ?? []), ...server.other])];
  const notices = !item ? [] : draftNotices(draft, current);
  const canSave = dirty && !!item && !Object.keys(problems).length && !other.length;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);
  const value = <F extends DraftField>(field: F) => draftValue(draft, current, field);
  function set<F extends DraftField>(field: F, next: DraftValues[F]) {
    setDraft(value => editDraft(value, current, field, next));
    setError(null);
    setSaved(false);
  }
  function notice(field: DraftField) {
    const found = notices.find(notice => notice.field === field);
    if (!found) return null;
    return (
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-pretty">
          Changed by {changedBy(revisions, current.id, field)} to{' '}
          {summarize(chart, field, found.theirs)}.
        </span>
        <button
          type="button"
          className="-my-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-medium underline-offset-2 hover:underline"
          onClick={() => {
            setDraft(value => takeTheirs(value, field));
            if (field === 'owners' || field === 'links')
              setText(text => {
                const next = { ...text };
                delete next[field];
                return next;
              });
          }}
        >
          Use theirs
        </button>
      </div>
    );
  }
  function close() {
    if (dirty) setConfirm(true);
    else onClose();
  }
  async function submit() {
    const event = { nativeEvent: { isTrusted: trusted.current ?? false } as Event };
    trusted.current = null;
    if (!canSave) return;
    const reason = await save(
      [{ type: 'update', id: current.id, version: draft.version, fields: patch }],
      event,
    );
    if (reason) return setError(reason);
    setDraft(emptyDraft);
    setText({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }
  if (readOnly)
    return (
      <Sheet
        open
        onOpenChange={open => {
          if (!open) onClose();
        }}
      >
        <SheetContent className="gap-0 sm:max-w-md">
          <Header chart={chart} item={current} />
          <dl className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-6 text-sm">
            {[
              ['Date', current.on ?? `${current.start} — ${current.end}`],
              ['Description', current.description],
              ['Owners', current.owners?.join(', ')],
              ['Group', chart.groups.find(group => group.id === current.group)?.name],
              [
                'Comes after',
                chart.items
                  .filter(other => current.after?.includes(other.id))
                  .map(other => other.name || 'Unnamed Item')
                  .join(', '),
              ],
            ].map(([term, detail]) => (
              <div key={term} className="grid gap-1">
                <dt className="text-xs font-medium text-muted-foreground">{term}</dt>
                <dd className="whitespace-pre-wrap text-pretty">{detail || '—'}</dd>
              </div>
            ))}
            <div className="grid gap-1">
              <dt className="text-xs font-medium text-muted-foreground">Links</dt>
              <dd className="grid gap-1">
                {current.links?.length
                  ? current.links.map(link => (
                      <a
                        key={link}
                        className="truncate text-primary underline-offset-4 hover:underline"
                        href={/^https?:\/\//.test(link) ? link : undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link}
                      </a>
                    ))
                  : '—'}
              </dd>
            </div>
          </dl>
          <div className={footer}>
            <CopyLink item={current} />
          </div>
        </SheetContent>
      </Sheet>
    );
  const dates = value('dates');
  const after = value('after');
  return (
    <Sheet
      open
      onOpenChange={open => {
        if (!open) close();
      }}
    >
      <SheetContent className="gap-0 sm:max-w-md">
        <Header chart={chart} item={current} />
        <form
          className="flex min-h-0 flex-1 flex-col"
          onKeyDown={event => {
            if (event.key !== 'Enter') return;
            trusted.current = event.nativeEvent.isTrusted;
            setTimeout(() => (trusted.current = null));
            if (event.metaKey || event.ctrlKey) {
              event.preventDefault();
              void submit();
            }
          }}
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-6">
            {gone && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="text-pretty">
                  This Item was deleted by someone else. Your unsaved changes are still here to
                  copy.
                </span>
              </p>
            )}
            <Field
              label="Name"
              htmlFor="details-name"
              error={problems.name}
              notice={notice('name')}
            >
              <Input
                id="details-name"
                value={value('name')}
                onChange={event => set('name', event.target.value)}
              />
            </Field>
            {'on' in dates ? (
              <Field
                label="Date"
                htmlFor="details-on"
                error={problems.dates}
                notice={notice('dates')}
              >
                <Input
                  id="details-on"
                  type="date"
                  aria-invalid={!!problems.dates || undefined}
                  value={dates.on}
                  onChange={event => set('dates', { on: event.target.value })}
                />
              </Field>
            ) : (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start" htmlFor="details-start">
                    <Input
                      id="details-start"
                      type="date"
                      aria-invalid={!!problems.dates || undefined}
                      value={dates.start}
                      onChange={event =>
                        set('dates', { start: event.target.value, end: dates.end })
                      }
                    />
                  </Field>
                  <Field label="End" htmlFor="details-end">
                    <Input
                      id="details-end"
                      type="date"
                      aria-invalid={!!problems.dates || undefined}
                      value={dates.end}
                      onChange={event =>
                        set('dates', { start: dates.start, end: event.target.value })
                      }
                    />
                  </Field>
                </div>
                {problems.dates && <p className="text-xs text-destructive">{problems.dates}</p>}
                {notice('dates')}
              </div>
            )}
            <Field label="Description" htmlFor="details-description" notice={notice('description')}>
              <Textarea
                id="details-description"
                value={value('description')}
                onChange={event => set('description', event.target.value)}
              />
            </Field>
            <Field
              label="Owners"
              htmlFor="details-owners"
              hint="Separate names with commas."
              notice={notice('owners')}
            >
              <Input
                id="details-owners"
                value={text.owners ?? value('owners').join(', ')}
                onChange={event => {
                  setText(text => ({ ...text, owners: event.target.value }));
                  set('owners', parse(event.target.value, ','));
                }}
              />
            </Field>
            <Field label="Group" notice={notice('group')}>
              <Select
                value={value('group') ?? 'none'}
                onValueChange={group => {
                  if (group) set('group', group === 'none' ? null : group);
                }}
              >
                <SelectTrigger aria-label="Group" className="w-full">
                  <SelectValue>
                    {chart.groups.find(group => group.id === value('group'))?.name ?? 'No Group'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {chart.groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Comes after" error={problems.after} notice={notice('after')}>
              <Combobox
                multiple
                items={chart.items.filter(other => other.id !== current.id)}
                value={chart.items.filter(other => after.includes(other.id))}
                itemToStringLabel={other => other.name || 'Unnamed Item'}
                isItemEqualToValue={(a, b) => a.id === b.id}
                onValueChange={items =>
                  set(
                    'after',
                    items.map(value => value.id),
                  )
                }
              >
                <ComboboxChips ref={anchor} aria-invalid={!!problems.after || undefined}>
                  <ComboboxValue>
                    {(values: Item[]) => (
                      <>
                        {values.map(other => (
                          <ComboboxChip key={other.id}>{other.name || 'Unnamed Item'}</ComboboxChip>
                        ))}
                        <ComboboxChipsInput
                          aria-label="Comes after"
                          placeholder={values.length ? '' : 'Find an Item'}
                        />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={anchor}>
                  <ComboboxEmpty>No matching Items</ComboboxEmpty>
                  <ComboboxList>
                    {other => (
                      <ComboboxItem key={other.id} value={other}>
                        {other.name || 'Unnamed Item'}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
            <Field
              label="Links"
              htmlFor="details-links"
              hint="One link per line."
              notice={notice('links')}
            >
              <Textarea
                id="details-links"
                value={text.links ?? value('links').join('\n')}
                onChange={event => {
                  setText(text => ({ ...text, links: event.target.value }));
                  set('links', parse(event.target.value, '\n'));
                }}
              />
            </Field>
            {check?.conflicts.length ? (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="grid gap-0.5 text-pretty">
                  {check.conflicts.map(conflict => (
                    <span key={conflict}>{conflict}</span>
                  ))}
                </span>
              </div>
            ) : null}
            {other.length ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="text-pretty">{other.join(' ')}</span>
              </p>
            ) : null}
          </div>
          <div className={footer}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete Item"
              title="Delete Item"
              disabled={!item}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={event => {
                setDeleting(true);
                void onDelete(current, event).then(reason => {
                  if (!reason) return;
                  setDeleting(false);
                  setError(reason);
                });
              }}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <CopyLink item={current} />
              <Button
                type="submit"
                disabled={!canSave}
                className={saved ? 'disabled:opacity-100' : undefined}
                onClick={event => {
                  trusted.current ??= event.nativeEvent.isTrusted;
                }}
              >
                {saved && <CheckIcon aria-hidden="true" />}
                {saved ? 'Saved' : 'Save Item'}
              </Button>
            </div>
          </div>
        </form>
        <Dialog
          open={confirm}
          onOpenChange={open => {
            if (!open) setConfirm(false);
          }}
        >
          <DialogContent showCloseButton={false} className="sm:max-w-sm">
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your changes to {current.name || 'this Item'} have not been saved.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)} autoFocus>
                Keep editing
              </Button>
              <Button variant="destructive" onClick={onClose}>
                Discard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
