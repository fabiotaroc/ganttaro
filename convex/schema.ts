import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
export const itemValue = v.object({
  id: v.string(), name: v.string(), version: v.number(),
  start: v.optional(v.string()), end: v.optional(v.string()), on: v.optional(v.string()),
  after: v.optional(v.array(v.string())), group: v.optional(v.string()), owners: v.optional(v.array(v.string())),
  description: v.optional(v.string()), links: v.optional(v.array(v.string())),
});
export const groupValue = v.object({ id: v.string(), name: v.string(), color: v.union(...['indigo','blue','teal','green','amber','orange','rose','violet'].map(color => v.literal(color))) });
export const zoomValue = v.union(v.literal('days'), v.literal('weeks'), v.literal('months'));
export const kindValue = v.union(v.literal('Manual'), v.literal('Agent (MCP)'), v.literal('Agent (Bridge)'));
export default defineSchema({
  mcpSessions: defineTable({ token: v.string(), client: v.string(), expires: v.number() }).index('by_token', ['token']),
  charts: defineTable({ title: v.string(), description: v.optional(v.string()), editKey: v.string(), viewKey: v.string(), version: v.number(), defaultZoom: zoomValue, holidays: v.array(v.string()), order: v.array(v.string()) }).index('by_edit', ['editKey']).index('by_view', ['viewKey']),
  items: defineTable({ chartId: v.id('charts'), itemId: v.string(), kind: v.union(v.literal('Task'), v.literal('Milestone')), value: itemValue }).index('by_chart', ['chartId']),
  groups: defineTable({ chartId: v.id('charts'), groupId: v.string(), value: groupValue }).index('by_chart', ['chartId']),
  revisions: defineTable({ chartId: v.id('charts'), kind: kindValue, client: v.optional(v.string()), timestamp: v.number(), diffs: v.array(v.object({ target: v.union(v.literal('chart'), v.literal('item'), v.literal('group')), id: v.string(), field: v.string(), before: v.any(), after: v.any() })), before: v.any(), after: v.any() }).index('by_chart', ['chartId']),
});
