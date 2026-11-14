import { endOf, palette, startOf, type Chart, type Conflict, type Flag, type Item, type Validation } from './types';
import { dateNumber, isWeekday, previousWorkingDay } from './calendar';
export function hasCycle(items: readonly Item[]): boolean {
  const byId = new Map(items.map(item => [item.id, item]));
  const active = new Set<string>(), complete = new Set<string>();
  function visit(id: string): boolean {
    if (active.has(id)) return true;
    if (complete.has(id)) return false;
    active.add(id);
    if ((byId.get(id)?.after ?? []).some(visit)) return true;
    active.delete(id); complete.add(id); return false;
  }
  return items.some(item => visit(item.id));
}
export function conflicts(chart: Chart): Conflict[] {
  const byId = new Map(chart.items.map(item => [item.id, item]));
  return chart.items.flatMap(item => (item.after ?? []).flatMap(id => {
    const predecessor = byId.get(id);
    if (!predecessor) return [];
    const start = startOf(item);
    const conflict = predecessor.on !== undefined ? start < predecessor.on : start <= previousWorkingDay(endOf(predecessor), chart.holidays, true);
    return conflict ? [{ item: item.id, after: id }] : [];
  }));
}
export function flags(chart: Chart): Flag[] {
  return chart.items.flatMap(item => {
    const result: Flag[] = [];
    if (!item.name.trim()) result.push({ item: item.id, kind: 'empty-name' });
    for (const date of new Set([startOf(item), endOf(item)])) if (chart.holidays.includes(date)) result.push({ item: item.id, kind: 'holiday', date });
    return result;
  });
}
export function validate(chart: Chart): Validation {
  const reasons: string[] = [];
  const ids = new Set(chart.items.map(item => item.id));
  if (ids.size !== chart.items.length) reasons.push('Item IDs must be unique');
  if (new Set(chart.groups.map(group => group.id)).size !== chart.groups.length) reasons.push('Group IDs must be unique');
  for (const group of chart.groups) if (!palette.includes(group.color)) reasons.push(`Unknown Group colour: ${group.color}`);
  if (!['days', 'weeks', 'months'].includes(chart.zoom)) reasons.push('Unknown zoom');
  for (const holiday of chart.holidays) {
    try { if (!isWeekday(holiday)) reasons.push(`Holiday must be a weekday: ${holiday}`); }
    catch { reasons.push(`Invalid Holiday: ${holiday}`); }
  }
  for (const item of chart.items) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) reasons.push(`Invalid Item ID: ${item.id}`);
    const milestone = item.on !== undefined;
    if (milestone ? item.start !== undefined || item.end !== undefined : item.start === undefined || item.end === undefined) reasons.push(`${item.id}: use either on or start and end`);
    try {
      dateNumber(startOf(item)); dateNumber(endOf(item));
      if (!isWeekday(startOf(item)) || !isWeekday(endOf(item))) reasons.push(`${item.id}: weekend dates are refused`);
      if (endOf(item) < startOf(item)) reasons.push(`${item.id}: end is before start`);
    } catch { reasons.push(`${item.id}: invalid date`); }
    if (item.group && !chart.groups.some(group => group.id === item.group)) reasons.push(`${item.id}: unknown Group ${item.group}`);
    for (const id of item.after ?? []) {
      if (!ids.has(id)) reasons.push(`${item.id}: missing Item ${id}`);
      if (id === item.id) reasons.push(`${item.id}: Dependency points to itself`);
    }
  }
  if (hasCycle(chart.items)) reasons.push('Dependencies create a loop');
  return reasons.length ? { ok: false, reasons } : { ok: true, flags: flags(chart) };
}
export function generateId(name: string, existing: Iterable<string>): string {
  const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '') || 'item';
  const used = new Set(existing);
  let id = base;
  for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
  return id;
}
export function tidy(items: readonly Item[]): Item[] {
  const byId = new Map(items.map(item => [item.id, item]));
  const neighbors = new Map(items.map(item => [item.id, new Set(item.after ?? [])]));
  for (const item of items) for (const id of item.after ?? []) neighbors.get(id)?.add(item.id);
  const seen = new Set<string>();
  const chains: Item[][] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    const chain: Item[] = [], pending = [item.id];
    while (pending.length) {
      const id = pending.pop()!;
      if (seen.has(id)) continue;
      seen.add(id); const member = byId.get(id); if (member) chain.push(member);
      pending.push(...neighbors.get(id) ?? []);
    }
    chains.push(chain.sort((a, b) => startOf(a).localeCompare(startOf(b)) || items.indexOf(a) - items.indexOf(b)));
  }
  return chains.sort((a, b) => startOf(a[0]).localeCompare(startOf(b[0])) || items.indexOf(a[0]) - items.indexOf(b[0])).flat();
}
