import { createChange, createConnect, createGridFocus, createFocusRecovery, createInlineEdit, createReorder, createSpans, definePrimitive, type ChangeDetails, type ConnectDraft, type GridCell, type ReorderDraft, type Span, type SpansDraft } from '@ui-sdk/core';
import { applyChanges, compact, endOf, hasCycle, isWorkingDay, layout, nextWorkingDay, previousWorkingDay, startOf, type Chart, type Change, } from '@ganttaro/core';
export type ChartSpan = Span & { name: string };
export type EditDetails = { source: string; reason: string };
export type GanttOptions = {
  chart: Chart; start: string; end: string;
  onRequestChange: (changes: Change[], details: ChangeDetails<string>) => void;
  settled: () => Promise<unknown>;
  onOpen: (id: string) => void;
  onError: (message: string) => void;
  onRestore: (id: string) => Promise<unknown>;
};
export function bridgeState(chart: Chart) {
  return chart.items.length <= 60 ? compact(chart) : { chart: { id: chart.id, title: chart.title, version: chart.version }, itemCount: chart.items.length, hint: 'Call describe for full compact JSON' };
}
function spansFor(options: Pick<GanttOptions, 'chart' | 'start' | 'end'>): ChartSpan[] {
  const positions = layout(options.chart, { start: options.start, end: options.end });
  return options.chart.items.map((item, index) => ({ id: item.id, track: item.id, name: item.name, start: positions.bars[index].x / positions.columnWidth, end: (positions.bars[index].x + positions.bars[index].width) / positions.columnWidth }));
}
export const readActions = ['get_chart', 'get_items', 'describe'];
export const editActions = ['add_items','update_items','remove','set_dependencies','set_holidays','tidy','update_chart','set_groups','reorder','restore_revision'];
export function makeGantt(readOnly: boolean) {
  return definePrimitive({
    name: 'gantt',
    options: { chart: 'value', start: 'string', end: 'string', onRequestChange: 'callback', settled: 'action', onOpen: 'callback', onError: 'callback', onRestore: 'action' },
    controlled: ['value'],
    state: (options: GanttOptions) => ({ chart: options.chart, value: bridgeState(options.chart), items: spansFor(options), order: options.chart.items.map(item => item.id), request: [] as Change[], active: null as GridCell | null, draft: null as SpansDraft<ChartSpan> | null, moving: null as ReorderDraft | null, connecting: null as ConnectDraft | null, editing: null as string | null }),
    sync: options => ({ chart: options.chart, value: bridgeState(options.chart), items: spansFor(options), order: options.chart.items.map(item => item.id) }),
    api: context => {
      const change = createChange(context);
      const chart = () => context.store.get().chart;
      const item = (ref: string) => {
        const matches = chart().items.filter(item => item.id === ref || item.name.toLowerCase() === ref.toLowerCase());
        if (matches.length !== 1) throw new Error('Name is unknown or ambiguous; use an Item ID from get_items');
        return matches[0];
      };
      const emit = (changes: Change[], reason: string, event?: Event) => {
        if (readOnly) throw new Error('A View Link cannot edit');
        const next = applyChanges(chart(), changes);
        if (!next.ok) { context.options().onError(next.reasons.join('; ')); throw new Error(next.reasons.join('; ')); }
        return change('request', changes, { reason, event });
      };
      const run = (changes: Change[]) => { emit(changes, 'imperative'); return context.options().settled(); };
      const recovery = createFocusRecovery({ fallback: () => context.element('bar', chart().items[0]?.id) ?? context.element('root') });
      const grid = createGridFocus(context, { key: 'active', rows: () => chart().items.length, cols: () => 2 });
      const versioned = (ref: string, fields: Extract<Change, {type:'update'}>['fields']): Change => { const found = item(ref); return { type: 'update', id: found.id, version: found.version, fields }; };
      const spans = createSpans<ReturnType<typeof context.store.get>, ChartSpan>(context, {
        key: 'items', draft: 'draft', axis: 'x', min: () => 0,
        max: () => layout(chart(), { start: context.options().start, end: context.options().end }).columns.length,
        step: () => 1, minSize: () => 1, label: span => span.name,
        disabled: () => readOnly,
        set: (values, details) => {
          const columns = layout(chart(), { start: context.options().start, end: context.options().end }).columns;
          const changes: Change[] = [];
          for (const value of values) {
            const prior = context.store.get().items.find(span => span.id === value.id);
            if (!prior || (prior.start === value.start && prior.end === value.end)) continue;
            const original = item(value.id);
            let start = columns[Math.round(value.start)]?.date, end = columns[Math.round(value.end) - 1]?.date;
            if (!start || !end) return false;
            if (!isWorkingDay(start, chart().holidays)) start = value.start >= prior.start ? nextWorkingDay(start, chart().holidays, true) : previousWorkingDay(start, chart().holidays, true);
            if (!isWorkingDay(end, chart().holidays)) end = value.end >= prior.end ? nextWorkingDay(end, chart().holidays, true) : previousWorkingDay(end, chart().holidays, true);
            changes.push(versioned(original.id, original.on !== undefined ? { on: start } : { start, end }));
          }
          if (!changes.length) return false;
          try { return emit(changes, details.reason, details.event); } catch { return false; }
        },
      });
      const reorder = createReorder(context, { slot: 'label', key: 'order', draft: 'moving', orientation: () => 'vertical', label: id => item(id).name, disabled: () => readOnly, set: (ids, details) => emit([{ type: 'order', ids }], details.reason, details.event) });
      const edit = createInlineEdit(context, { key: 'editing', value: id => item(id).name, disabled: () => readOnly, commit: (id, name, details) => emit([versioned(id, { name })], details.reason, details.event) });
      const connect = createConnect(context, {
        slot: 'port', draft: 'connecting',
        canConnect: (from, to) => {
          if (readOnly || !from.endsWith(':out') || !to.endsWith(':in')) return false;
          const a = from.slice(0,-4), b = to.slice(0,-3);
          const loop = a === b || hasCycle(chart().items.map(value => value.id === b ? { ...value, after: [...value.after ?? [], a] } : value));
          if (loop) context.options().onError('That Dependency would create a loop');
          return !loop;
        },
        point: (x, y) => { const rect = context.element('grid')?.getBoundingClientRect(); return rect ? { x: x - rect.left, y: y - rect.top } : { x, y }; },
        label: port => `${item(port.split(':')[0]).name} ${port.endsWith(':out') ? 'end' : 'start'}`,
        connect: (from, to, details) => { const found = item(to.slice(0,-3)); return emit([versioned(found.id, { after: [...new Set([...found.after ?? [], from.slice(0,-4)])] })], details.reason, details.event); },
      });
      return {
        grid, spans, reorder, edit, connect, item, recovery,
        get_chart: () => compact(chart()), describe: () => compact(chart()),
        get_items: (ids: string[]) => chart().items.filter(value => ids.includes(value.id)),
        add_items: (items: Extract<Change, {type:'add'}>['item'][], index?: number) => run(items.map((value, offset) => ({ type: 'add', item: value, ...(index === undefined ? {} : { index: index + offset }) }))),
        update_items: (items: { id: string; fields: Extract<Change, {type:'update'}>['fields'] }[]) => run(items.map(value => versioned(value.id, value.fields))),
        remove: (id: string) => { const found = item(id); return run([{ type: 'delete', id: found.id, version: found.version }]); },
        set_dependencies: (id: string, after: string[]) => run([versioned(id, { after })]),
        set_holidays: (dates: string[]) => run([{ type: 'holidays', dates }]),
        tidy: () => run([{ type: 'tidy' }]),
        update_chart: (fields: Extract<Change, {type:'chart'}>['fields']) => run([{ type: 'chart', fields }]),
        set_groups: (groups: Chart['groups']) => run([{ type: 'groups', groups }]),
        reorderItems: (ids: string[]) => run([{ type: 'order', ids }]),
        restore_revision: (id: string) => { if (readOnly) throw new Error('A View Link cannot edit'); return context.options().onRestore(id); },
        open: (id: string) => context.options().onOpen(id),
        keydown: (event: KeyboardEvent, id: string, col: number) => {
          if (connect.active()) { connect.keydown(event); return; }
          if (!readOnly && col === 0 && (event.key === ' ' || context.store.get().moving)) { reorder.keydown(event, id); return; }
          if (!readOnly && col === 0 && event.key === 'F2') { edit.keydown(event, id); return; }
          if (!readOnly && col === 1 && event.altKey && ['ArrowLeft','ArrowRight'].includes(event.key)) {
            event.preventDefault(); const original = item(id), direction = event.key === 'ArrowRight' ? 1 : -1;
            const shift = (date: string) => direction > 0 ? nextWorkingDay(date, chart().holidays) : previousWorkingDay(date, chart().holidays);
            emit([versioned(id, original.on !== undefined ? { on: shift(original.on) } : { ...(event.shiftKey ? {} : { start: shift(startOf(original)) }), end: shift(endOf(original)) })], 'move-key', event); return;
          }
          if (!readOnly && col === 1 && event.key.toLowerCase() === 'c') { event.preventDefault(); connect.start(`${id}:out`); return; }
          if (!readOnly && col === 1 && event.key === 'Delete') { event.preventDefault(); emit([{ type: 'delete', id, version: item(id).version }], 'remove-key', event); return; }
          if (event.key === 'Enter') { event.preventDefault(); context.options().onOpen(id); return; }
          grid.keydown(event);
        },
      };
    },
    slots: slot => ({
      root: slot({ role: 'grid', focus: { none: 'Gridcells own the roving tab stop' }, keys: { none: 'Gridcells handle navigation' }, attrs: state => ({ 'aria-rowcount': String(state.chart.items.length), 'aria-colcount': '2', 'aria-readonly': String(readOnly), tabindex: '-1' }), state: state => ({ chart: state.chart, items: state.draft?.spans ?? state.items, order: state.moving?.order ?? state.order, editing: state.editing, connecting: state.connecting }) }),
      grid: slot({}), row: slot({ role: 'row' }),
      label: slot<{ value: string; row: number }>({ props: { value: 'string', row: 'number' }, role: 'gridcell', focus: 'roving', keys: ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter','F2','Space'], attrs: (state, part) => ({ tabindex: part.api.grid.tabIndex(state, { row: part.props.row, col: 0 }) }),
        on: { keydown: (event, { api, key }) => api.keydown(event, key, 0), pointerdown: (event, { api, key }) => { if (!readOnly) api.reorder.pointerdown(event, key); }, dblclick: (event, { api, key }) => { if (!readOnly) api.edit.dblclick(event, key); } },
        bind: (el, part) => { const a = part.api.grid.bind(el, { row: part.props.row, col: 0 }); const b = part.api.reorder.bind(el, part); const c = part.api.recovery.bind(el, part); return () => { a?.(); b?.(); c(); }; },
      }),
      input: slot({ on: { keydown: (event, { api }) => api.edit.inputKeydown(event), focusout: (event, { api }) => api.edit.end('focus-out', event) }, bind: (el, { api }) => api.edit.bindInput(el as HTMLInputElement) }),
      track: slot<{ value: string }>({ props: { value: 'string' }, bind: (el, { api, key }) => api.spans.bindTrack(el, key) }),
      bar: slot<{ value: string; row: number }>({ props: { value: 'string', row: 'number' }, role: 'gridcell', focus: 'roving', keys: ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter','Delete'], attrs: (state, part) => ({ tabindex: part.api.grid.tabIndex(state, { row: part.props.row, col: 1 }), ...part.api.spans.spanAttrs(state, part.key) }), on: { pointerdown: (event, { api, key }) => { if (!readOnly && !(event.target as HTMLElement).closest('[data-slot="gantt-port"],button,a')) api.spans.spanPointerdown(event, key); }, keydown: (event, { api, key }) => api.keydown(event, key, 1) }, bind: (el, part) => { const a = part.api.spans.bindSpan(el, part.key); const b = part.api.grid.bind(el, { row: part.props.row, col: 1 }); const c = part.api.recovery.bind(el, part); return () => { a?.(); b?.(); c(); }; } }),
      port: slot<{ value: string }>({ props: { value: 'string' }, attrs: (state, part) => ({ 'aria-hidden': 'true', 'data-connect': part.api.connect.role(state, part.key) }), on: { pointerdown: (event, { el, api, key }) => { event.stopPropagation(); if (!readOnly && el) api.connect.pointerdown(event, key, el); } } }),
    }),
    agent: { actions: readOnly ? readActions : [...readActions, ...editActions.filter(action => action !== 'reorder'), 'reorderItems'], items: () => [] },
  });
}
export const gantt = makeGantt(false);
export const viewGantt = makeGantt(true);
