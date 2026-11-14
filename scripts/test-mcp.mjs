import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const client = new Client({ name: 'Milestone verification', version: '1.0.0' });
const headers = process.env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_OIDC_TOKEN } : {};
const transport = new StreamableHTTPClientTransport(new URL(process.argv[2] ?? 'http://localhost:3100/mcp'), { requestInit: { headers } });
await client.connect(transport);
const call = async (name, args) => {
  const response = await client.callTool({ name, arguments: args });
  return JSON.parse(response.content[0].text);
};
try {
  const tools = await client.listTools(); assert.equal(tools.tools.length, 13);
  const created = await call('create_chart', { title: 'MCP verification', holidays: ['2026-12-08'], groups: [{ id: 'build', name: 'Build', color: 'indigo' }], items: [
    { id: 'kickoff', name: 'Kickoff', on: '2026-11-16' },
    { id: 'api', name: 'Build API', start: '2026-11-17', end: '2026-11-20', after: ['kickoff'], group: 'build' },
  ] });
  assert.equal(created.ok, true);
  const link = created.editLink;
  const read = await call('get_chart', { link: created.viewLink }); assert.equal(read.items.length, 2);
  assert.equal((await call('update_items', { link, items: [{ id: 'api', version: 1, fields: { name: 'Renamed API' } }] })).ok, true);
  const refused = await call('update_items', { link, items: [{ id: 'api', version: 1, fields: { end: '2026-11-23' } }] });
  assert.equal(refused.ok, false); assert.equal(refused.items[0].name, 'Renamed API');
  const reread = await call('get_items', { link, ids: ['api'] });
  assert.equal((await call('update_items', { link, items: [{ id: 'api', version: reread.items[0].version, fields: { end: '2026-11-23' } }] })).ok, true);
  const updated = await call('get_items', { link, ids: ['api'] }); assert.equal(updated.items[0].name, 'Renamed API'); assert.equal(updated.items[0].end, '2026-11-23');
  const history = await call('list_revisions', { link }); assert.equal(history[0].client, 'Milestone verification');
  assert.equal((await call('restore_revision', { link, revision: created.revisionId, versions: (await call('get_chart', {link})).items.map(({id,version})=>({id,version})) })).ok, true);
  const restored = await call('get_items', { link, ids: ['api'] }); assert.equal(restored.items[0].name, 'Build API');
  const viewWrite = await client.callTool({ name: 'tidy', arguments: { link: created.viewLink } }); assert.equal(viewWrite.isError, true);
  console.log('PASS: MCP handshake, tools, create, View Link read, update, stale refusal, reread/retry, client attribution, restore, View Link write refusal.');
} finally { await client.close(); }
