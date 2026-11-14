import { v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { applyChanges, compact, diffCharts, italianHolidays, staleItems, validate, type Chart, type Change, type Group, type Item } from '../packages/core/src/index';
import { groupValue, itemValue, kindValue, zoomValue } from './schema';
export async function access(ctx: QueryCtx | MutationCtx, key: string, edit = false): Promise<Doc<'charts'>> {
  const chart = await ctx.db.query('charts').withIndex('by_edit', q => q.eq('editKey', key)).unique();
  if (chart) return chart;
  if (!edit) {
    const viewed = await ctx.db.query('charts').withIndex('by_view', q => q.eq('viewKey', key)).unique();
    if (viewed) return viewed;
  }
  throw new Error(edit ? 'An Edit Link is required' : 'Chart not found');
}
export async function load(ctx: QueryCtx | MutationCtx, record: Doc<'charts'>): Promise<Chart> {
  const items = await ctx.db.query('items').withIndex('by_chart', q => q.eq('chartId', record._id)).collect();
  const groups = await ctx.db.query('groups').withIndex('by_chart', q => q.eq('chartId', record._id)).collect();
  const byId = new Map(items.map(item => [item.itemId, item.value as Item]));
  return { id: record._id, title: record.title, ...(record.description ? { description: record.description } : {}), version: record.version, zoom: record.defaultZoom, holidays: record.holidays, items: record.order.map(id => byId.get(id)!), groups: groups.map(group => group.value as Group) };
}
export const get = query({ args: { key: v.string(), full: v.optional(v.boolean()) }, handler: async (ctx, args) => compact(await load(ctx, await access(ctx, args.key)), args.full) });
export const getItems = query({ args: { key: v.string(), ids: v.array(v.string()) }, handler: async (ctx, args) => {
  const chart = await load(ctx, await access(ctx, args.key));
  return { items: chart.items.filter(item => args.ids.includes(item.id)), conflicts: compact(chart).conflicts, flags: compact(chart).flags };
} });
export const history = query({ args: { key: v.string() }, handler: async (ctx, args) => {
  const record = await access(ctx, args.key);
  const revisions = await ctx.db.query('revisions').withIndex('by_chart', q => q.eq('chartId', record._id)).order('desc').take(200);
  return revisions.map(({ _id, timestamp, kind, client, diffs }) => ({ id: _id, timestamp, kind, ...(client ? { client } : {}), diffs }));
} });
async function persist(ctx: MutationCtx, chartId: Id<'charts'>, chart: Chart) {
  await ctx.db.patch(chartId, { title: chart.title, description: chart.description, version: chart.version, defaultZoom: chart.zoom, holidays: chart.holidays, order: chart.items.map(item => item.id) });
  const stored = await ctx.db.query('items').withIndex('by_chart', q => q.eq('chartId', chartId)).collect();
  for (const record of stored) if (!chart.items.some(item => item.id === record.itemId)) await ctx.db.delete(record._id);
  for (const item of chart.items) {
    const record = stored.find(record => record.itemId === item.id);
    const value = { chartId, itemId: item.id, kind: item.on !== undefined ? 'Milestone' as const : 'Task' as const, value: item };
    if (!record) await ctx.db.insert('items', value);
    else if (JSON.stringify(record.value) !== JSON.stringify(item)) await ctx.db.replace(record._id, value);
  }
  const groups = await ctx.db.query('groups').withIndex('by_chart', q => q.eq('chartId', chartId)).collect();
  for (const record of groups) if (!chart.groups.some(group => group.id === record.groupId)) await ctx.db.delete(record._id);
  for (const group of chart.groups) {
    const record = groups.find(record => record.groupId === group.id);
    const value = { chartId, groupId: group.id, value: group };
    if (record) await ctx.db.replace(record._id, value); else await ctx.db.insert('groups', value);
  }
}
export const write = mutation({
  args: {
    key: v.string(), kind: kindValue, client: v.optional(v.string()), changes: v.optional(v.any()),
    create: v.optional(v.object({ viewKey: v.string(), title: v.string(), description: v.optional(v.string()), zoom: v.optional(zoomValue), holidays: v.optional(v.array(v.string())), groups: v.optional(v.array(groupValue)), items: v.optional(v.array(itemValue)) })),
    restore: v.optional(v.id('revisions')), versions: v.optional(v.array(v.object({id:v.string(),version:v.number()}))), inverse: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let record: Doc<'charts'>, before: Chart;
    if (args.create) {
      if (!/^[A-Za-z0-9_-]{43,}$/.test(args.key) || !/^[A-Za-z0-9_-]{43,}$/.test(args.create.viewKey) || args.key === args.create.viewKey) throw new Error('Use separate long, random Edit and View keys');
      for (const key of [args.key, args.create.viewKey]) {
        if (await ctx.db.query('charts').withIndex('by_edit', q => q.eq('editKey', key)).first() || await ctx.db.query('charts').withIndex('by_view', q => q.eq('viewKey', key)).first()) throw new Error('Key already in use');
      }
      const id = await ctx.db.insert('charts', { title: args.create.title, editKey: args.key, viewKey: args.create.viewKey, version: 0, defaultZoom: args.create.zoom ?? 'weeks', holidays: [], order: [] });
      record = (await ctx.db.get(id))!;
      before = await load(ctx, record);
    } else {
      record = await access(ctx, args.key, true); before = await load(ctx, record);
    }
    let after: Chart;
    if (args.restore) {
      const revision = await ctx.db.get(args.restore);
      if (!revision || revision.chartId !== record._id) throw new Error('Revision not found');
      if (args.kind !== 'Manual') {
        const expected = new Map((args.versions ?? []).map(item => [item.id,item.version]));
        const current = before.items.filter(item => expected.get(item.id) !== item.version);
        const missing = (args.versions ?? []).filter(item => !before.items.some(value => value.id === item.id)).map(item => item.id);
        if (current.length || missing.length) return {ok:false as const,reasons:['Items changed since your last read. Call get_chart and retry restoring.'],items:current,missing};
      }
      after = (args.inverse ? revision.before : revision.after) as Chart;
      after = { ...after, version: before.version + 1, items: after.items.map(item => ({ ...item, version: before.version + 1 })) };
    } else if (args.create) {
      after = { ...before, version: 1, ...(args.create.description ? { description: args.create.description } : {}), holidays: args.create.holidays ?? italianHolidays(new Date().getUTCFullYear()), groups: (args.create.groups ?? []) as Group[], items: (args.create.items ?? []).map(item => ({ ...item, version: 1 })) as Item[] };
    } else {
      if (!Array.isArray(args.changes) || !args.changes.length) throw new Error('Provide at least one change');
      const changes = args.changes as Change[];
      if (args.kind !== 'Manual') {
        const stale = staleItems(before, changes);
        const missing = changes.filter(change => (change.type === 'update' || change.type === 'delete') && !before.items.some(item => item.id === change.id)).map(change => (change as {id:string}).id);
        if (stale.length || missing.length) return { ok: false as const, reasons: ['Items changed since your last read. Call get_items and retry.'], items: stale, missing };
      }
      const result = applyChanges(before, changes);
      if (!result.ok) return result;
      after = result.chart;
    }
    const validation = validate(after);
    if (!validation.ok) {
      // Throw on creation so the temporary Chart record rolls back atomically.
      if (args.create) throw new Error(validation.reasons.join('; '));
      return validation;
    }
    await persist(ctx, record._id, after);
    const revisionId = await ctx.db.insert('revisions', { chartId: record._id, kind: args.kind, ...(args.client ? { client: args.client } : {}), timestamp: Date.now(), diffs: diffCharts(before, after), before, after });
    const prior = compact(before), current = compact(after);
    return { ok: true as const, chart: current, revisionId, conflicts: current.conflicts.filter(value => !prior.conflicts.some(old => old.item === value.item && old.after === value.after)), flags: current.flags.filter(value => !prior.flags.some(old => JSON.stringify(old) === JSON.stringify(value))) };
  },
});
