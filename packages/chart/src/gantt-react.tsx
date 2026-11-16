'use client';
import { useEffect, useRef, useState } from 'react';
import { createParts } from '@ui-sdk/react/primitive';
import {
  conflicts,
  endOf,
  flags,
  layout,
  nextWorkingDay,
  startOf,
  workingDaysBetween,
  type Chart,
  type Change,
  type Group,
  type Item,
} from '@ganttaro/core';
import { gantt, viewGantt, type EditDetails } from './gantt';
const editParts = createParts(gantt, {
  root: 'div',
  grid: 'div',
  row: 'div',
  label: 'div',
  input: 'input',
  track: 'div',
  bar: 'div',
  port: 'span',
});
const viewParts = createParts(viewGantt, {
  root: 'div',
  grid: 'div',
  row: 'div',
  label: 'div',
  input: 'input',
  track: 'div',
  bar: 'div',
  port: 'span',
});
export const rowHeight = 48;
type Column = { date: string; x: number };
const day = (date: string) => new Date(`${date}T00:00:00Z`);
const weekday = (date: string) =>
  day(date).toLocaleDateString('en', { weekday: 'narrow', timeZone: 'UTC' });
// Weekends are hidden, so a week starts on the first visible column after a gap of more than one day.
function weekStart(columns: Column[], index: number) {
  if (index === 0) return true;
  return day(columns[index].date).getTime() - day(columns[index - 1].date).getTime() > 86_400_000;
}
function months(columns: Column[]) {
  const result: { key: string; label: string; x: number; columns: number }[] = [];
  for (const column of columns) {
    const key = column.date.slice(0, 7),
      last = result.at(-1);
    if (last?.key === key) last.columns++;
    else
      result.push({
        key,
        x: column.x,
        columns: 1,
        label: day(column.date).toLocaleDateString('en', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      });
  }
  return result;
}
const shortDate = (date: string, year: boolean, weekday = false) =>
  day(date).toLocaleDateString('en', {
    ...(weekday ? { weekday: 'short' } : {}),
    month: 'short',
    day: 'numeric',
    ...(year ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
function HoverCard({
  item,
  group,
  holidays,
  notes,
  onOpen,
}: {
  item: Item;
  group?: Group;
  holidays: string[];
  notes: { conflict: boolean; text: string }[];
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  // The chart clips its overflow, so place the card against the window instead:
  // below the bar when it fits, otherwise above, and never past the window's edges.
  useEffect(() => {
    const card = ref.current,
      bar = card?.parentElement;
    if (!card || !bar) return;
    const place = () => {
      if (getComputedStyle(card).display === 'none') return;
      const anchor = bar.getBoundingClientRect(),
        { width, height } = card.getBoundingClientRect(),
        margin = 8,
        gap = 4;
      const above = anchor.bottom + gap + height > innerHeight - margin && anchor.top > height;
      card.dataset.side = above ? 'top' : 'bottom';
      card.style.top = `${above ? anchor.top - gap - height : anchor.bottom + gap}px`;
      card.style.left = `${Math.max(margin, Math.min(anchor.left, innerWidth - width - margin))}px`;
    };
    const show = () => {
      requestAnimationFrame(place);
      addEventListener('scroll', place, true);
    };
    const hide = () =>
      requestAnimationFrame(() => {
        if (bar.matches(':hover, :focus-within')) return;
        removeEventListener('scroll', place, true);
        delete card.dataset.side;
      });
    bar.addEventListener('pointerenter', show);
    bar.addEventListener('focusin', show);
    bar.addEventListener('pointerleave', hide);
    bar.addEventListener('focusout', hide);
    return () => {
      hide();
      bar.removeEventListener('pointerenter', show);
      bar.removeEventListener('focusin', show);
      bar.removeEventListener('pointerleave', hide);
      bar.removeEventListener('focusout', hide);
    };
  }, []);
  const milestone = item.on !== undefined;
  const start = startOf(item),
    end = endOf(item);
  const days = workingDaysBetween(start, end, holidays);
  const stop = (event: React.PointerEvent) => event.stopPropagation();
  return (
    <span className="gantt-hover" ref={ref}>
      <span className="gantt-hover-kind">
        <span className="group-swatch" data-group={group?.color ?? 'indigo'} aria-hidden="true" />
        {group?.name ?? 'No Group'}
        <span aria-hidden="true">·</span>
        {milestone ? 'Milestone' : 'Task'}
      </span>
      <strong className="gantt-hover-name">{item.name || 'Unnamed Item'}</strong>
      <span className="gantt-hover-dates">
        {milestone
          ? shortDate(start, true, true)
          : `${shortDate(start, start.slice(0, 4) !== end.slice(0, 4))} – ${shortDate(end, true)}`}
        {!milestone && (
          <span>
            {days} Working Day{days === 1 ? '' : 's'}
          </span>
        )}
      </span>
      {notes.map(note => (
        <span
          key={note.text}
          className="gantt-hover-note"
          data-conflict={note.conflict || undefined}
        >
          {note.text}
        </span>
      ))}
      {item.description && <span className="gantt-hover-description">{item.description}</span>}
      {item.owners?.length ? (
        <span className="gantt-hover-owners" aria-label="Owners">
          {item.owners.map(owner => (
            <span key={owner}>
              <span aria-hidden="true">{owner.slice(0, 1).toUpperCase()}</span>
              {owner}
            </span>
          ))}
        </span>
      ) : null}
      {item.links?.length ? (
        <span className="gantt-hover-links">
          {item.links.map(link => (
            <a
              key={link}
              href={/^https?:\/\//.test(link) ? link : undefined}
              target="_blank"
              rel="noreferrer"
              onPointerDown={stop}
            >
              {link.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          ))}
        </span>
      ) : null}
      <span className="gantt-hover-actions">
        <button
          type="button"
          title="Copy link to this Item"
          onPointerDown={stop}
          onClick={event => {
            event.stopPropagation();
            void navigator.clipboard
              .writeText(`${location.origin}${location.pathname}#item-${item.id}`)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button
          type="button"
          onPointerDown={stop}
          onClick={event => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Open details
        </button>
      </span>
    </span>
  );
}
type Span = { start: number; end: number };
// Milestones are drawn as a diamond centred in their column, about 16px wide.
const diamond = 8;
const exit = (span: Span, milestone: boolean, width: number) =>
  milestone ? ((span.start + span.end) / 2) * width + diamond : span.end * width;
const entry = (span: Span, milestone: boolean, width: number) =>
  milestone ? ((span.start + span.end) / 2) * width - diamond : span.start * width;
// When the successor starts left of the predecessor's exit (for example a Task on its
// predecessor Milestone's date), detour along the row boundary so the arrow still enters
// from the left.
function route(x1: number, y1: number, x2: number, y2: number) {
  const gap = 12;
  if (x2 - x1 >= gap * 2) return `M${x1},${y1} H${x2 - gap} V${y2} H${x2}`;
  const lane = y2 + (y2 > y1 ? -rowHeight / 2 : rowHeight / 2);
  return `M${x1},${y1} H${x1 + gap} V${lane} H${x2 - gap} V${y2} H${x2}`;
}
export function Gantt({
  chart,
  start,
  end,
  readOnly,
  empty,
  onEdit,
  onOpen,
  onError,
  onRestore,
  onHistory,
  onHoliday,
  onDisconnect,
}: {
  chart: Chart;
  start: string;
  end: string;
  readOnly: boolean;
  empty?: React.ReactNode;
  onEdit: (changes: Change[], details: EditDetails) => Promise<unknown>;
  onOpen: (id: string) => void;
  onError: (message: string) => void;
  onRestore: (id: string) => Promise<unknown>;
  onHistory: () => unknown;
  onHoliday: (date: string, event: React.MouseEvent) => void;
  onDisconnect: (
    item: string,
    after: string,
    event: React.KeyboardEvent | React.MouseEvent,
  ) => void;
}) {
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const parts = readOnly ? viewParts : editParts;
  const geometry = layout(chart, { start, end });
  const today = new Date().toISOString().slice(0, 10);
  const todayBoundary = nextWorkingDay(today, [], true);
  const bad = new Set(conflicts(chart).map(value => value.item));
  const flagged = new Set(flags(chart).map(value => value.item));
  const notes = new Map<string, { conflict: boolean; text: string }[]>();
  const note = (id: string, conflict: boolean, text: string) =>
    notes.set(id, [...(notes.get(id) ?? []), { conflict, text }]);
  for (const id of bad)
    note(id, true, 'Conflict: starts before an Item it comes after has finished');
  for (const flag of flags(chart))
    note(flag.item, false, flag.kind === 'holiday' ? `On a Holiday: ${flag.date}` : 'Has no name');
  return (
    <parts.Root
      chart={chart}
      start={start}
      end={end}
      aria-label="Chart"
      className="gantt"
      data-chart-id={chart.id}
      onRequestChange={(changes, details) => {
        pending.current = onEdit(changes, details);
        void pending.current.catch(error =>
          onError(error instanceof Error ? error.message : String(error)),
        );
      }}
      settled={() => pending.current}
      onOpen={onOpen}
      onError={onError}
      onRestore={onRestore}
      onHistory={onHistory}
    >
      {state => {
        const byId = new Map(chart.items.map(item => [item.id, item]));
        const spanById = new Map(state.items.map(span => [span.id, span]));
        return (
          <div className="gantt-scroll">
            <div className="gantt-calendar" style={{ width: geometry.width + 256 }}>
              <div className="gantt-heading">
                Items <span>{chart.items.length}</span>
              </div>
              <div className="gantt-days" data-zoom={chart.zoom} style={{ width: geometry.width }}>
                <div className="gantt-months" aria-hidden="true">
                  {months(geometry.columns).map(month => (
                    <span
                      key={month.key}
                      style={{ left: month.x, width: month.columns * geometry.columnWidth }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
                {geometry.columns.map((column, index) => {
                  const label = chart.zoom === 'days' || weekStart(geometry.columns, index);
                  return (
                    <button
                      key={column.date}
                      type="button"
                      disabled={readOnly}
                      aria-label={`${column.date}${column.holiday ? ', Holiday' : ''}`}
                      title={readOnly ? column.date : `Toggle Holiday ${column.date}`}
                      data-holiday={column.holiday || undefined}
                      data-today={column.date === today || undefined}
                      data-week={weekStart(geometry.columns, index) || undefined}
                      onClick={event => onHoliday(column.date, event)}
                      style={{ left: column.x, width: geometry.columnWidth }}
                    >
                      {label && (
                        <span aria-hidden="true">
                          {chart.zoom === 'days' && <small>{weekday(column.date)}</small>}
                          {Number(column.date.slice(8))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <parts.Grid
              className="gantt-grid"
              style={{
                width: geometry.width + 256,
                minHeight: Math.max(144, chart.items.length * rowHeight),
              }}
            >
              <div
                className="gantt-columns"
                data-zoom={chart.zoom}
                aria-hidden="true"
                style={{ left: 256 }}
              >
                {geometry.columns.map((column, index) => (
                  <div
                    key={column.date}
                    data-holiday={column.holiday || undefined}
                    data-today={column.date === todayBoundary || undefined}
                    data-week={weekStart(geometry.columns, index) || undefined}
                    data-month={
                      (index > 0 &&
                        column.date.slice(0, 7) !== geometry.columns[index - 1].date.slice(0, 7)) ||
                      undefined
                    }
                    title={column.date === todayBoundary ? `Today: ${today}` : undefined}
                    style={{ left: column.x, width: geometry.columnWidth }}
                  />
                ))}
              </div>
              {state.order.map((id, row) => {
                const item = byId.get(id),
                  span = spanById.get(id);
                if (!item || !span) return null;
                return (
                  <parts.Row key={id} className="gantt-row" style={{ height: rowHeight }}>
                    {state.editing === id ? (
                      <div className="gantt-name">
                        <parts.Input aria-label={`Rename ${item.name || 'unnamed Item'}`} />
                      </div>
                    ) : (
                      <parts.Label
                        value={id}
                        row={row}
                        className="gantt-name"
                        data-item-id={id}
                        data-chart-id={chart.id}
                        title="F2 to rename; Space to reorder"
                      >
                        <span aria-hidden="true">{item.on !== undefined ? '◇' : '≡'}</span>
                        <strong>{item.name || 'Unnamed Item'}</strong>
                        {(bad.has(id) || flagged.has(id)) && (
                          <em aria-label={bad.has(id) ? 'Conflict' : 'Flagged'}>!</em>
                        )}
                      </parts.Label>
                    )}
                    <parts.Track
                      value={id}
                      className="gantt-track"
                      style={{ width: geometry.width }}
                    >
                      <parts.Bar
                        value={id}
                        row={row}
                        className="gantt-bar"
                        data-milestone={item.on !== undefined || undefined}
                        data-conflict={bad.has(id) || undefined}
                        data-group={
                          chart.groups.find(group => group.id === item.group)?.color ?? 'indigo'
                        }
                        data-item-id={id}
                        data-chart-id={chart.id}
                        id={`item-${id}`}
                        aria-label={`${item.name || 'Unnamed Item'}: ${startOf(item)}${item.on !== undefined ? '' : ` to ${endOf(item)}`}${bad.has(id) ? ', Conflict' : ''}`}
                        aria-description="Enter: details. Alt+arrows: move. Alt+Shift+arrows: resize. C: Dependency. Delete: remove."
                        style={{
                          left: span.start * geometry.columnWidth,
                          width: (span.end - span.start) * geometry.columnWidth,
                        }}
                        onDoubleClick={() => onOpen(id)}
                      >
                        {!readOnly && (
                          <>
                            <span data-span-edge="start" className="gantt-edge start" />
                            <parts.Port value={`${id}:in`} className="gantt-port in" />
                          </>
                        )}
                        <span className="gantt-bar-name">
                          {item.on !== undefined ? '◆' : item.name}
                        </span>
                        <HoverCard
                          item={item}
                          group={chart.groups.find(group => group.id === item.group)}
                          holidays={chart.holidays}
                          notes={notes.get(id) ?? []}
                          onOpen={() => onOpen(id)}
                        />
                        {!readOnly && (
                          <>
                            <parts.Port value={`${id}:out`} className="gantt-port out" />
                            <span data-span-edge="end" className="gantt-edge end" />
                          </>
                        )}
                      </parts.Bar>
                    </parts.Track>
                  </parts.Row>
                );
              })}
              <svg
                className="gantt-arrows"
                width={geometry.width}
                height={chart.items.length * rowHeight}
                style={{ left: 256 }}
                aria-label="Dependencies"
              >
                <defs>
                  <marker
                    id="gantt-arrow"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0 0 L6 3 L0 6" fill="currentColor" />
                  </marker>
                </defs>
                {chart.items.flatMap(item =>
                  (item.after ?? []).map(after => {
                    const a = spanById.get(after),
                      b = spanById.get(item.id);
                    if (!a || !b) return null;
                    const x1 = exit(a, byId.get(after)?.on !== undefined, geometry.columnWidth),
                      y1 = state.order.indexOf(after) * rowHeight + rowHeight / 2;
                    const x2 = entry(b, item.on !== undefined, geometry.columnWidth),
                      y2 = state.order.indexOf(item.id) * rowHeight + rowHeight / 2;
                    return (
                      <path
                        key={`${after}:${item.id}`}
                        d={route(x1, y1, x2, y2)}
                        markerEnd="url(#gantt-arrow)"
                        className={bad.has(item.id) ? 'conflict' : ''}
                        tabIndex={readOnly ? undefined : 0}
                        aria-label={`${item.name} comes after ${byId.get(after)?.name}. Delete removes this Dependency.`}
                        onClick={event => event.currentTarget.focus()}
                        onKeyDown={event => {
                          if (!readOnly && (event.key === 'Delete' || event.key === 'Backspace')) {
                            event.preventDefault();
                            onDisconnect(item.id, after, event);
                          }
                        }}
                      />
                    );
                  }),
                )}
                {state.connecting && !state.connecting.to && (
                  <line
                    x1={(() => {
                      const id = state.connecting.from.split(':')[0],
                        span = spanById.get(id);
                      return span
                        ? exit(span, byId.get(id)?.on !== undefined, geometry.columnWidth)
                        : 0;
                    })()}
                    y1={
                      state.order.indexOf(state.connecting.from.split(':')[0]) * rowHeight +
                      rowHeight / 2
                    }
                    x2={state.connecting.x - 256}
                    y2={state.connecting.y}
                  />
                )}
              </svg>
              {!chart.items.length && (
                <div className="gantt-empty">{empty ?? <p>This Chart has no Items yet.</p>}</div>
              )}
            </parts.Grid>
          </div>
        );
      }}
    </parts.Root>
  );
}
