import { randomBytes, randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { generateId, italianHolidays, palette, type Change, type Item, type ItemInput } from '@ganttaro/core';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const details = { name: z.string(), after: z.array(z.string()).optional(), group: z.string().optional(), owners: z.array(z.string()).optional(), description: z.string().optional(), links: z.array(z.string().url()).optional() };
const itemInput = z.union([z.object({ ...details, id: z.string().optional(), start: date, end: date }), z.object({ ...details, id: z.string().optional(), on: date })]);
const patch = z.object({ name: z.string().optional(), start: date.optional(), end: date.optional(), on: date.optional(), after: z.array(z.string()).optional(), group: z.string().nullable().optional(), owners: z.array(z.string()).optional(), description: z.string().optional(), links: z.array(z.string().url()).optional() }).strict();
const group = z.object({ id: z.string(), name: z.string(), color: z.enum(palette) });
const update = z.object({ id: z.string(), version: z.number().int().positive(), fields: patch });
const deletion = z.object({ id: z.string(), version: z.number().int().positive() });
const chartFields = z.object({ title: z.string().optional(), description: z.string().optional(), zoom: z.enum(['days','weeks','months']).optional() }).strict();
const change = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add'), item: itemInput, index: z.number().int().nonnegative().optional() }),
  update.extend({ type: z.literal('update') }), deletion.extend({ type: z.literal('delete') }),
  z.object({ type: z.literal('order'), ids: z.array(z.string()) }), z.object({ type: z.literal('holidays'), dates: z.array(date) }),
  z.object({ type: z.literal('groups'), groups: z.array(group) }), z.object({ type: z.literal('chart'), fields: chartFields }), z.object({ type: z.literal('tidy') }),
]);
export function chartKey(link: string): string {
  if (!link.includes('://')) return link;
  const url = new URL(link);
  const match = /^\/(?:c|v)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
  if (!match) throw new Error('Provide a Chart Edit Link, View Link, or key');
  return match[1];
}
export function convexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');
  return new ConvexHttpClient(url);
}
export function createMcpServer(db: ConvexHttpClient, origin: string, client: string) {
  const server = new McpServer({ name: 'Ganttaro', version: '0.1.0' });
  const result = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], ...(typeof value === 'object' && value !== null && 'ok' in value && !value.ok ? { isError: true } : {}) });
  const link = { link: z.string().describe('Secret Chart Edit Link, View Link, or key. Writes require an Edit Link.') };
  async function write(input: { link: string; changes?: Change[]; restore?: Id<'revisions'> }) {
    const key = chartKey(input.link), sessionId = randomUUID();
    const count = input.changes?.filter(value => ['add','update','delete'].includes(value.type)).length ?? 0;
    const presence = await db.mutation(api.presence.heartbeat, { roomId: key, userId: `${client} is editing ${count} Items`, sessionId, interval: 30000 });
    try { return await db.mutation(api.charts.write, { key, kind: 'Agent (MCP)', client, ...(input.changes ? { changes: input.changes } : {}), ...(input.restore ? { restore: input.restore } : {}) }); }
    finally { await db.mutation(api.presence.disconnect, { sessionToken: presence.sessionToken }); }
  }
  server.registerTool('create_chart', { description: 'Create a Chart from compact JSON fields or a short spec: first line title, then Name | YYYY-MM-DD [.. YYYY-MM-DD] per Item. Return both secret links. Dates are inclusive weekdays.', inputSchema: { title: z.string().optional(), description: z.string().optional(), zoom: z.enum(['days','weeks','months']).optional(), holidays: z.array(date).optional(), groups: z.array(group).optional(), items: z.array(itemInput).optional(), spec: z.string().optional() } }, async input => {
    let title = input.title, inputs = input.items ?? [];
    if (input.spec) {
      const lines = input.spec.split('\n').map(line => line.trim()).filter(Boolean);
      title ??= lines.shift();
      inputs = lines.map(line => {
        const match = /^(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})(?:\s*\.\.\s*(\d{4}-\d{2}-\d{2}))?$/.exec(line);
        if (!match) throw new Error('Spec format: title on first line, then Name | YYYY-MM-DD [.. YYYY-MM-DD]');
        return match[3] ? { name: match[1].trim(), start: match[2], end: match[3] } : { name: match[1].trim(), on: match[2] };
      });
    }
    if (!title) throw new Error('Provide a title or short spec');
    const ids: string[] = [];
    const items: Item[] = inputs.map(input => { const id = input.id ?? generateId(input.name, ids); ids.push(id); return { ...input, id, version: 1 } as Item; });
    const key = randomBytes(32).toString('base64url'), viewKey = randomBytes(32).toString('base64url');
    const response = await db.mutation(api.charts.write, { key, kind: 'Agent (MCP)', client, create: { viewKey, title, ...(input.description ? { description: input.description } : {}), zoom: input.zoom ?? 'weeks', holidays: input.holidays ?? italianHolidays(Number((items[0]?.on ?? items[0]?.start ?? new Date().toISOString()).slice(0,4))), groups: input.groups ?? [], items } });
    return result({ ...response, editLink: `${origin}/c/${key}`, viewLink: `${origin}/v/${viewKey}` });
  });
  server.registerTool('get_chart', { description: 'Read a Chart as compact JSON in stored row order. Includes Conflicts, flags and Item versions; excludes Item description and links.', inputSchema: link }, async ({ link }) => result(await db.query(api.charts.get, { key: chartKey(link) })));
  server.registerTool('get_items', { description: 'Read named Items in full, including versions, description and links. Call after a stale refusal.', inputSchema: { ...link, ids: z.array(z.string()) } }, async ({ link, ids }) => result(await db.query(api.charts.getItems, { key: chartKey(link), ids })));
  server.registerTool('add_items', { description: 'Add Items in stored row order. Provide an optional insertion index.', inputSchema: { ...link, items: z.array(itemInput), index: z.number().int().nonnegative().optional() } }, async ({ link, items, index }) => result(await write({ link, changes: items.map((item, i) => ({ type: 'add', item: item as ItemInput, ...(index !== undefined ? { index: index + i } : {}) })) })));
  server.registerTool('update_items', { description: 'Change individual fields. Every Item requires the version from its last read. Refuse the whole call if any is stale.', inputSchema: { ...link, items: z.array(update) } }, async ({ link, items }) => result(await write({ link, changes: items.map(item => ({ type: 'update', ...item })) })));
  server.registerTool('delete_items', { description: 'Delete Items and remove Dependencies pointing to them. Requires versions; recorded as a Revision.', inputSchema: { ...link, items: z.array(deletion) } }, async ({ link, items }) => result(await write({ link, changes: items.map(item => ({ type: 'delete', ...item })) })));
  server.registerTool('apply_changes', { description: 'Apply an atomic bulk list of field changes, including Groups and row order. Updates and deletions require Item versions.', inputSchema: { ...link, changes: z.array(change) } }, async ({ link, changes }) => result(await write({ link, changes: changes as Change[] })));
  server.registerTool('set_dependencies', { description: 'Set an Item’s Comes after list. Requires its version; loops are refused, Conflicts are saved as warnings.', inputSchema: { ...link, id: z.string(), version: z.number().int().positive(), after: z.array(z.string()) } }, async ({ link, id, version, after }) => result(await write({ link, changes: [{ type: 'update', id, version, fields: { after } }] })));
  server.registerTool('set_holidays', { description: 'Replace Chart Holidays with weekday ISO dates. Item dates never move.', inputSchema: { ...link, dates: z.array(date) } }, async ({ link, dates }) => result(await write({ link, changes: [{ type: 'holidays', dates }] })));
  server.registerTool('tidy', { description: 'Sort rows once by start date, keeping Dependency chains together. Never move dates.', inputSchema: link }, async ({ link }) => result(await write({ link, changes: [{ type: 'tidy' }] })));
  server.registerTool('update_chart', { description: 'Change title, description or default zoom.', inputSchema: { ...link, fields: chartFields } }, async ({ link, fields }) => result(await write({ link, changes: [{ type: 'chart', fields }] })));
  server.registerTool('restore_revision', { description: 'Restore a previous Revision as a new Revision. Use list_revisions to find IDs.', inputSchema: { ...link, revision: z.string() } }, async ({ link, revision }) => result(await write({ link, restore: revision as Id<'revisions'> })));
  server.registerTool('list_revisions', { description: 'Read recent Revisions, their field diffs and IDs for restoration.', inputSchema: link }, async ({ link }) => result(await db.query(api.charts.history, { key: chartKey(link) })));
  return server;
}
