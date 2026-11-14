/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import presenceTest from '@convex-dev/presence/test';
import schema from './schema';
import { api } from './_generated/api';
const modules = import.meta.glob('./**/*.{ts,js}');
function setup() { const t = convexTest(schema, modules); presenceTest.register(t); return t; }
const key = 'e'.repeat(43), view = 'v'.repeat(43);
async function create(t: ReturnType<typeof setup>) {
  return t.mutation(api.charts.write, { key, kind: 'Manual', create: { title: 'Test', viewKey: view, holidays: [], items: [{ id: 'api', name: 'Build API', start: '2026-11-16', end: '2026-11-20', version: 1 }] } });
}
describe('the single Chart mutation path', () => {
  it('allows both links to read and only the Edit Link to write', async () => {
    const t = setup(); await create(t);
    expect((await t.query(api.charts.get, { key: view })).items).toHaveLength(1);
    await expect(t.mutation(api.charts.write, { key: view, kind: 'Manual', changes: [{ type: 'chart', fields: { title: 'No' } }] })).rejects.toThrow('Edit Link');
    await expect(t.query(api.charts.get, { key: 'unknown' })).rejects.toThrow('not found');
    expect(JSON.stringify(await t.query(api.charts.get, { key: view }))).not.toContain(key);
    expect(JSON.stringify(await t.query(api.charts.history, { key: view }))).not.toContain(key);
  });
  it('keeps independent field edits and accepts stale Manual Edits', async () => {
    const t = setup(); await create(t);
    await Promise.all([
      t.mutation(api.charts.write, { key, kind: 'Manual', changes: [{ type: 'update', id: 'api', fields: { name: 'Renamed' } }] }),
      t.mutation(api.charts.write, { key, kind: 'Manual', changes: [{ type: 'update', id: 'api', version: 0, fields: { end: '2026-11-23' } }] }),
    ]);
    expect((await t.query(api.charts.get, { key })).items[0]).toMatchObject({ name: 'Renamed', end: '2026-11-23', version: 3 });
  });
  it('refuses the entire stale Agent Edit, returns current Items, and supports retry', async () => {
    const t = setup(); await create(t);
    await t.mutation(api.charts.write, { key, kind: 'Manual', changes: [{ type: 'update', id: 'api', fields: { name: 'Renamed' } }] });
    const changes = [{ type: 'update', id: 'api', version: 1, fields: { end: '2026-11-23' } }, { type: 'chart', fields: { title: 'Stale' } }];
    const refused = await t.mutation(api.charts.write, { key, kind: 'Agent (MCP)', client: 'Claude', changes });
    expect(refused).toMatchObject({ ok: false, items: [{ name: 'Renamed', version: 2 }] });
    expect((await t.query(api.charts.get, { key })).chart.title).toBe('Test');
    const reread = await t.query(api.charts.getItems, { key, ids: ['api'] });
    changes[0].version = reread.items[0].version;
    expect(await t.mutation(api.charts.write, { key, kind: 'Agent (MCP)', client: 'Claude', changes })).toMatchObject({ ok: true });
    const history = await t.query(api.charts.history, { key });
    expect(history).toHaveLength(3); expect(history[0]).toMatchObject({ kind: 'Agent (MCP)', client: 'Claude' });
  });
  it('applies stale rejection to Agent Edits through the Bridge too', async () => {
    const t = setup(); await create(t);
    expect(await t.mutation(api.charts.write, { key, kind: 'Agent (Bridge)', changes: [{ type: 'delete', id: 'api', version: 0 }] })).toMatchObject({ ok: false });
  });
  it('refuses invalid changes without creating a Revision', async () => {
    const t = setup(); await create(t);
    expect(await t.mutation(api.charts.write, { key, kind: 'Manual', changes: [{ type: 'update', id: 'api', fields: { start: '2026-11-21' } }] })).toMatchObject({ ok: false });
    expect(await t.query(api.charts.history, { key })).toHaveLength(1);
  });
  it('restores any earlier Revision as a new Revision with fresh versions', async () => {
    const t = setup(); const first = await create(t); if (!first.ok) throw Error();
    await t.mutation(api.charts.write, { key, kind: 'Manual', changes: [{ type: 'update', id: 'api', fields: { name: 'Changed' } }] });
    const restored = await t.mutation(api.charts.write, { key, kind: 'Manual', restore: first.revisionId });
    expect(restored).toMatchObject({ ok: true, chart: { items: [{ name: 'Build API', version: 3 }] } });
    expect(await t.query(api.charts.history, { key })).toHaveLength(3);
    const second = (await t.query(api.charts.history, { key }))[1];
    expect(await t.mutation(api.charts.write, { key, kind: 'Manual', restore: second.id, inverse: true })).toMatchObject({ ok: true, chart: { items: [{ name: 'Build API' }] } });
  });
  it('rolls back invalid creation and refuses weak credentials', async () => {
    const t = setup();
    await expect(t.mutation(api.charts.write, { key: 'short', kind: 'Manual', create: { title: 'Bad', viewKey: view } })).rejects.toThrow();
    await expect(t.mutation(api.charts.write, { key, kind: 'Manual', create: { title: 'Bad', viewKey: view, items: [{ id: 'a', name: 'Bad', start: '2026-11-21', end: '2026-11-23', version: 1 }] } })).rejects.toThrow();
    await expect(t.query(api.charts.get, { key })).rejects.toThrow();
  });
  it('authorises presence through a Chart key and disconnects sessions', async () => {
    const t = setup(); await create(t);
    await expect(t.mutation(api.presence.heartbeat, { roomId: 'unknown', userId: 'Reader', sessionId: 'test', interval: 10000 })).rejects.toThrow();
    const session = await t.mutation(api.presence.heartbeat, { roomId: view, userId: 'Reader', sessionId: 'test', interval: 10000 });
    expect(await t.query(api.presence.list, { roomToken: session.roomToken })).toMatchObject([{ userId: 'Reader', online: true }]);
    await t.mutation(api.presence.disconnect, { sessionToken: session.sessionToken });
    expect(await t.query(api.presence.list, { roomToken: session.roomToken })).toMatchObject([{ online: false }]);
  });
});
