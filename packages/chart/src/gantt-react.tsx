'use client';
import { useRef } from 'react';
import { createParts } from '@ui-sdk/react/primitive';
import { conflicts, endOf, flags, layout, nextWorkingDay, startOf, type Chart, type Change } from '@ganttaro/core';
import { gantt, viewGantt, type EditDetails } from './gantt';
const editParts = createParts(gantt, { root: 'div', grid: 'div', row: 'div', label: 'div', input: 'input', track: 'div', bar: 'div', port: 'span' });
const viewParts = createParts(viewGantt, { root: 'div', grid: 'div', row: 'div', label: 'div', input: 'input', track: 'div', bar: 'div', port: 'span' });
export const rowHeight = 48;
export function Gantt({ chart, start, end, readOnly, onEdit, onOpen, onError, onRestore, onHistory, onHoliday, onDisconnect }: {
  chart: Chart; start: string; end: string; readOnly: boolean;
  onEdit: (changes: Change[], details: EditDetails) => Promise<unknown>;
  onOpen: (id: string) => void; onError: (message: string) => void;
  onRestore: (id: string) => Promise<unknown>; onHistory: () => unknown;
  onHoliday: (date: string, event: React.MouseEvent) => void;
  onDisconnect: (item: string, after: string, event: React.KeyboardEvent | React.MouseEvent) => void;
}) {
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const parts = readOnly ? viewParts : editParts;
  const geometry = layout(chart, { start, end });
  const today = new Date().toISOString().slice(0,10);
  const todayBoundary = nextWorkingDay(today, [], true);
  const bad = new Set(conflicts(chart).map(value => value.item));
  const flagged = new Set(flags(chart).map(value => value.item));
  return <parts.Root chart={chart} start={start} end={end} aria-label="Chart" className="gantt" data-chart-id={chart.id}
    onRequestChange={(changes, details) => { pending.current = onEdit(changes, details); void pending.current.catch(error => onError(error instanceof Error ? error.message : String(error))); }}
    settled={() => pending.current} onOpen={onOpen} onError={onError} onRestore={onRestore} onHistory={onHistory}>
    {state => {
      const byId = new Map(chart.items.map(item => [item.id, item]));
      const spanById = new Map(state.items.map(span => [span.id, span]));
      return <div className="gantt-scroll">
        <div className="gantt-calendar" style={{ width: geometry.width + 256 }}>
          <div className="gantt-heading">Items <span>{chart.items.length}</span></div>
          <div className="gantt-days" style={{ width: geometry.width }}>
            {geometry.columns.map(column => <button key={column.date} type="button" disabled={readOnly} aria-label={`${column.date}${column.holiday ? ', Holiday' : ''}`} title={readOnly ? column.date : `Toggle Holiday ${column.date}`} data-holiday={column.holiday || undefined} data-today={column.date === today || undefined} onClick={event => onHoliday(column.date, event)} style={{ left: column.x, width: geometry.columnWidth }}>{column.date.slice(8)}<small>{column.date.slice(5,7)}</small></button>)}
          </div>
        </div>
        <parts.Grid className="gantt-grid" style={{ width: geometry.width + 256, minHeight: Math.max(144, chart.items.length * rowHeight) }}>
          <div className="gantt-columns" aria-hidden="true" style={{ left: 256 }}>
            {geometry.columns.map(column => <div key={column.date} data-holiday={column.holiday || undefined} data-today={column.date === todayBoundary || undefined} title={column.date === todayBoundary ? `Today: ${today}` : undefined} style={{ left: column.x, width: geometry.columnWidth }} />)}
          </div>
          {state.order.map((id, row) => {
            const item = byId.get(id), span = spanById.get(id); if (!item || !span) return null;
            return <parts.Row key={id} className="gantt-row" style={{ height: rowHeight }}>
              {state.editing === id ? <div className="gantt-name"><parts.Input aria-label={`Rename ${item.name || 'unnamed Item'}`} /></div> : <parts.Label value={id} row={row} className="gantt-name" data-item-id={id} data-chart-id={chart.id} title="F2 to rename; Space to reorder"><span aria-hidden="true">{item.on !== undefined ? '◇' : '≡'}</span><strong>{item.name || 'Unnamed Item'}</strong>{(bad.has(id) || flagged.has(id)) && <em aria-label={bad.has(id) ? 'Conflict' : 'Flagged'}>!</em>}</parts.Label>}
              <parts.Track value={id} className="gantt-track" style={{ width: geometry.width }}>
                <parts.Bar value={id} row={row} className="gantt-bar" data-milestone={item.on !== undefined || undefined} data-conflict={bad.has(id) || undefined} data-group={chart.groups.find(group => group.id === item.group)?.color ?? 'indigo'} data-item-id={id} data-chart-id={chart.id} id={`item-${id}`} aria-label={`${item.name || 'Unnamed Item'}: ${startOf(item)}${item.on !== undefined ? '' : ` to ${endOf(item)}`}${bad.has(id) ? ', Conflict' : ''}`} aria-description="Enter: details. Alt+arrows: move. Alt+Shift+arrows: resize. C: Dependency. Delete: remove." title={[item.name, item.description, item.owners?.join(', '), ...(item.links ?? [])].filter(Boolean).join('\n')} style={{ left: span.start * geometry.columnWidth, width: (span.end - span.start) * geometry.columnWidth }} onDoubleClick={() => onOpen(id)}>
                  {!readOnly && <><span data-span-edge="start" className="gantt-edge start" /><parts.Port value={`${id}:in`} className="gantt-port in" /></>}
                  <span className="gantt-bar-name">{item.on !== undefined ? '◆' : item.name}</span>
                  <span className="gantt-hover"><strong>{item.name || 'Unnamed Item'}</strong><span>{startOf(item)}{item.on === undefined ? ` — ${endOf(item)}` : ''}</span>{item.description && <span>{item.description}</span>}{item.owners?.length ? <span>Owners: {item.owners.join(', ')}</span> : null}{item.links?.map(link => <a key={link} href={/^https?:\/\//.test(link) ? link : undefined} target="_blank" rel="noreferrer">{link}</a>)}<button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); void navigator.clipboard.writeText(`${location.origin}${location.pathname}#item-${id}`); }}>Copy link to this Item</button><button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onOpen(id); }}>Open details</button></span>
                  {!readOnly && <><parts.Port value={`${id}:out`} className="gantt-port out" /><span data-span-edge="end" className="gantt-edge end" /></>}
                </parts.Bar>
              </parts.Track>
            </parts.Row>;
          })}
          <svg className="gantt-arrows" width={geometry.width} height={chart.items.length * rowHeight} style={{ left: 256 }} aria-label="Dependencies">
            <defs><marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="currentColor" /></marker></defs>
            {chart.items.flatMap(item => (item.after ?? []).map(after => {
              const a = spanById.get(after), b = spanById.get(item.id); if (!a || !b) return null;
              const x1 = a.end * geometry.columnWidth, y1 = state.order.indexOf(after) * rowHeight + rowHeight / 2;
              const x2 = b.start * geometry.columnWidth, y2 = state.order.indexOf(item.id) * rowHeight + rowHeight / 2;
              const mid = Math.max(x1 + 12, x2 - 12);
              return <path key={`${after}:${item.id}`} d={`M${x1},${y1} H${mid} V${y2} H${x2}`} markerEnd="url(#gantt-arrow)" className={bad.has(item.id) ? 'conflict' : ''} tabIndex={readOnly ? undefined : 0} aria-label={`${item.name} comes after ${byId.get(after)?.name}. Delete removes this Dependency.`} onClick={event => event.currentTarget.focus()} onKeyDown={event => { if (!readOnly && event.key === 'Delete') { event.preventDefault(); onDisconnect(item.id, after, event); } }} />;
            }))}
            {state.connecting && !state.connecting.to && <line x1={(spanById.get(state.connecting.from.split(':')[0])?.end ?? 0) * geometry.columnWidth} y1={state.order.indexOf(state.connecting.from.split(':')[0]) * rowHeight + rowHeight/2} x2={state.connecting.x - 256} y2={state.connecting.y} />}
          </svg>
          {!chart.items.length && <p className="gantt-empty">This Chart is ready for its first Item.</p>}
        </parts.Grid>
      </div>;
    }}
  </parts.Root>;
}
