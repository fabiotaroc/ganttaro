import { type Chart, type Change, type CompactChart, type Conflict, type Flag, type Item } from './types';
import { conflicts, flags, generateId, tidy, validate } from './rules';
export type ApplyResult = { ok: true; chart: Chart; conflicts: Conflict[]; flags: Flag[] } | { ok: false; reasons: string[] };
export function applyChanges(original: Chart, changes: readonly Change[]): ApplyResult {
  const chart = structuredClone(original);
  const touched = new Set<string>();
  try {
    for (const change of changes) {
      switch (change.type) {
        case 'add': {
          const id = change.item.id ?? generateId(change.item.name, chart.items.map(item => item.id));
          if (chart.items.some(item => item.id === id)) throw new Error(`Duplicate Item: ${id}`);
          const item = { ...change.item, id, version: 1 } as Item;
          const index = change.index ?? chart.items.length;
          if (!Number.isInteger(index) || index < 0 || index > chart.items.length) throw new Error('Invalid row position');
          chart.items.splice(index, 0, item); break;
        }
        case 'update': {
          const item = chart.items.find(item => item.id === change.id);
          if (!item) throw new Error(`Unknown Item: ${change.id}`);
          const allowed = ['name','after','owners','description','links','start','end','on','group'];
          if (Object.keys(change.fields).some(key => !allowed.includes(key))) throw new Error('Unknown Item field');
          Object.assign(item, change.fields);
          if (change.fields.group === null) delete item.group;
          touched.add(item.id); break;
        }
        case 'delete': {
          if (!chart.items.some(item => item.id === change.id)) throw new Error(`Unknown Item: ${change.id}`);
          chart.items = chart.items.filter(item => item.id !== change.id);
          for (const item of chart.items) if (item.after?.includes(change.id)) {
            item.after = item.after.filter(id => id !== change.id); touched.add(item.id);
          }
          break;
        }
        case 'order': {
          if (change.ids.length !== chart.items.length || new Set(change.ids).size !== chart.items.length || change.ids.some(id => !chart.items.some(item => item.id === id))) throw new Error('Row order must contain every Item exactly once');
          chart.items = change.ids.map(id => chart.items.find(item => item.id === id)!); break;
        }
        case 'holidays': chart.holidays = [...new Set(change.dates)].sort(); break;
        case 'groups': chart.groups = structuredClone(change.groups); break;
        case 'chart': {
          if (Object.keys(change.fields).some(key => !['title','description','zoom'].includes(key))) throw new Error('Unknown Chart field');
          Object.assign(chart, change.fields); break;
        }
        case 'tidy': chart.items = tidy(chart.items); break;
        default: throw new Error('Unknown change');
      }
    }
    for (const item of chart.items) if (touched.has(item.id)) item.version++;
    const validation = validate(chart);
    if (!validation.ok) return validation;
    chart.version++;
    const beforeConflicts = new Set(conflicts(original).map(value => JSON.stringify(value)));
    const beforeFlags = new Set(flags(original).map(value => JSON.stringify(value)));
    return { ok: true, chart, conflicts: conflicts(chart).filter(value => !beforeConflicts.has(JSON.stringify(value))), flags: validation.flags.filter(value => !beforeFlags.has(JSON.stringify(value))) };
  } catch (error) { return { ok: false, reasons: [error instanceof Error ? error.message : 'Invalid change'] }; }
}
export function compact(chart: Chart, full = false): CompactChart {
  const { items, holidays, groups, ...settings } = chart;
  return {
    chart: omitEmpty(settings), holidays: [...holidays], groups: structuredClone(groups),
    items: items.map(item => {
      const copy = structuredClone(item);
      if (!full) { delete copy.description; delete copy.links; }
      return omitEmpty(copy);
    }),
    conflicts: conflicts(chart), flags: flags(chart),
  };
}
function omitEmpty<T extends object>(object: T): T {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && !value.length))) as T;
}
export function fromCompact(input: Pick<CompactChart, 'chart' | 'items' | 'groups' | 'holidays'>): Chart {
  const chart: Chart = { ...structuredClone(input.chart), items: structuredClone(input.items), holidays: [...input.holidays], groups: structuredClone(input.groups) };
  const validation = validate(chart);
  if (!validation.ok) throw new Error(validation.reasons.join('; '));
  return chart;
}
export function staleItems(chart: Chart, changes: readonly Change[]): Item[] {
  const expected = new Map<string, number | undefined>();
  for (const change of changes) if (change.type === 'update' || change.type === 'delete') {
    if (expected.has(change.id) && expected.get(change.id) !== change.version) throw new Error('Inconsistent Item versions');
    expected.set(change.id, change.version);
  }
  return chart.items.filter(item => expected.has(item.id) && expected.get(item.id) !== item.version);
}
export type FieldDiff = { target: 'chart' | 'item' | 'group'; id: string; field: string; before: unknown; after: unknown };
export function diffCharts(before: Chart, after: Chart): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  function fields(target: FieldDiff['target'], id: string, a: object, b: object) {
    const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
    for (const field of new Set([...Object.keys(left), ...Object.keys(right)])) if (JSON.stringify(left[field] ?? null) !== JSON.stringify(right[field] ?? null)) diffs.push({ target, id, field, before: left[field] ?? null, after: right[field] ?? null });
  }
  const { items: ai, groups: ag, ...ac } = before, { items: bi, groups: bg, ...bc } = after;
  fields('chart', before.id, { ...ac, order: ai.map(item => item.id) }, { ...bc, order: bi.map(item => item.id) });
  for (const target of ['item', 'group'] as const) {
    const a = target === 'item' ? ai : ag, b = target === 'item' ? bi : bg;
    for (const id of new Set([...a, ...b].map(value => value.id))) fields(target, id, a.find(value => value.id === id) ?? {}, b.find(value => value.id === id) ?? {});
  }
  return diffs;
}
