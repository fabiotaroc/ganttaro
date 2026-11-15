'use client';
import { useState } from 'react';
import type { Chart, Change, Item, ItemPatch } from '@ganttaro/core';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
export type EventEdit = (changes: Change[], event: { nativeEvent: Event }) => Promise<boolean>;
export function Details({
  chart,
  item,
  readOnly,
  onClose,
  edit,
}: {
  chart: Chart;
  item: Item;
  readOnly: boolean;
  onClose: () => void;
  edit: EventEdit;
}) {
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const value = (field: string, fallback: string) => dirty[field] ?? fallback;
  const field = (name: string, fallback: string, type = 'text') => (
    <Input
      id={`details-${name}`}
      type={type}
      readOnly={readOnly}
      value={value(name, fallback)}
      onChange={event => setDirty(current => ({ ...current, [name]: event.target.value }))}
    />
  );
  if (readOnly)
    return (
      <Sheet
        open
        onOpenChange={open => {
          if (!open) onClose();
        }}
      >
        <SheetContent className="overflow-y-auto p-7 sm:max-w-md">
          <SheetTitle>{item.name || 'Unnamed Item'}</SheetTitle>
          <SheetDescription>
            {item.on !== undefined ? 'Milestone' : 'Task'} details
          </SheetDescription>
          <dl className="mt-6 grid gap-4 text-sm">
            <div>
              <dt>Date</dt>
              <dd>{item.on ?? `${item.start} — ${item.end}`}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd className="whitespace-pre-wrap">{item.description || '—'}</dd>
            </div>
            <div>
              <dt>Owners</dt>
              <dd>{item.owners?.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Group</dt>
              <dd>{chart.groups.find(group => group.id === item.group)?.name || '—'}</dd>
            </div>
            <div>
              <dt>Comes after</dt>
              <dd>
                {chart.items
                  .filter(other => item.after?.includes(other.id))
                  .map(other => other.name)
                  .join(', ') || '—'}
              </dd>
            </div>
            <div>
              <dt>Links</dt>
              <dd>
                {item.links?.map(link => (
                  <p key={link}>
                    <a
                      href={/^https?:\/\//.test(link) ? link : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link}
                    </a>
                  </p>
                ))}
              </dd>
            </div>
          </dl>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(
                `${location.origin}${location.pathname}#item-${item.id}`,
              );
            }}
          >
            Copy link to this Item
          </Button>
        </SheetContent>
      </Sheet>
    );
  return (
    <Sheet
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="overflow-y-auto p-7 sm:max-w-md">
        <SheetTitle>{item.name || 'Unnamed Item'}</SheetTitle>
        <SheetDescription>{item.on !== undefined ? 'Milestone' : 'Task'} details</SheetDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={event => {
            event.preventDefault();
            const fields: ItemPatch = {};
            for (const [key, text] of Object.entries(dirty)) {
              if (key === 'owners' || key === 'links')
                fields[key] = text
                  .split(key === 'owners' ? ',' : '\n')
                  .map(value => value.trim())
                  .filter(Boolean);
              else Object.assign(fields, { [key]: text });
            }
            if (Object.keys(fields).length)
              void edit(
                [{ type: 'update', id: item.id, version: item.version, fields }],
                event,
              ).then(ok => {
                if (ok) setDirty({});
              });
          }}
        >
          <div>
            <Label htmlFor="details-name">Name</Label>
            {field('name', item.name)}
          </div>
          {item.on !== undefined ? (
            <div>
              <Label htmlFor="details-on">Date</Label>
              {field('on', item.on, 'date')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="details-start">Start</Label>
                {field('start', item.start!, 'date')}
              </div>
              <div>
                <Label htmlFor="details-end">End</Label>
                {field('end', item.end!, 'date')}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="details-description">Description</Label>
            <Textarea
              id="details-description"
              readOnly={readOnly}
              value={value('description', item.description ?? '')}
              onChange={event =>
                setDirty(current => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="details-owners">Owners</Label>
            {field('owners', item.owners?.join(', ') ?? '')}
            <p className="text-xs text-muted-foreground">Separate names with commas.</p>
          </div>
          <div>
            <Label>Group</Label>
            <Select
              value={item.group ?? 'none'}
              disabled={readOnly}
              onValueChange={(group, details) => {
                if (group)
                  void edit(
                    [
                      {
                        type: 'update',
                        id: item.id,
                        version: item.version,
                        fields: { group: group === 'none' ? null : group },
                      },
                    ],
                    { nativeEvent: details.event },
                  );
              }}
            >
              <SelectTrigger aria-label="Group">
                <SelectValue>
                  {chart.groups.find(group => group.id === item.group)?.name ?? 'No Group'}
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
          </div>
          <div>
            <Label>Comes after</Label>
            <Combobox
              multiple
              items={chart.items.filter(other => other.id !== item.id)}
              value={chart.items.filter(other => item.after?.includes(other.id))}
              itemToStringLabel={other => other.name || 'Unnamed Item'}
              isItemEqualToValue={(a, b) => a.id === b.id}
              onValueChange={(items, details) => {
                void edit(
                  [
                    {
                      type: 'update',
                      id: item.id,
                      version: item.version,
                      fields: { after: items.map(value => value.id) },
                    },
                  ],
                  { nativeEvent: details.event },
                );
              }}
              disabled={readOnly}
            >
              <ComboboxInput aria-label="Comes after" placeholder="Find an Item" />
              <ComboboxContent>
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
            <p className="mt-2 text-sm text-muted-foreground">
              {chart.items
                .filter(other => item.after?.includes(other.id))
                .map(other => other.name)
                .join(', ') || 'No Dependencies'}
            </p>
          </div>
          <div>
            <Label htmlFor="details-links">Links</Label>
            <Textarea
              id="details-links"
              readOnly={readOnly}
              value={value('links', item.links?.join('\n') ?? '')}
              onChange={event => setDirty(current => ({ ...current, links: event.target.value }))}
            />
            <p className="text-xs text-muted-foreground">One link per line.</p>
          </div>
          {!readOnly && (
            <Button type="submit" disabled={!Object.keys(dirty).length}>
              Save Item
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(
                `${location.origin}${location.pathname}#item-${item.id}`,
              );
            }}
          >
            Copy link to this Item
          </Button>
          {!readOnly && (
            <Button
              type="button"
              variant="destructive"
              onClick={event => {
                void edit([{ type: 'delete', id: item.id, version: item.version }], event).then(
                  ok => {
                    if (ok) onClose();
                  },
                );
              }}
            >
              Delete Item
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
