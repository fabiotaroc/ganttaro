import { randomUUID } from 'node:crypto';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer, convexClient } from '@/lib/mcp';
import { api } from '../../../../convex/_generated/api';
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get('origin') && request.headers.get('origin') !== origin) return new Response('Origin refused', { status: 403 });
  const body = await request.json();
  const db = convexClient();
  let token = request.headers.get('mcp-session-id');
  let client = 'MCP client';
  if (body.method === 'initialize') {
    client = String(body.params?.clientInfo?.name ?? client).slice(0, 160);
    token = randomUUID();
    await db.mutation(api.mcp.createSession, { token, client });
  } else if (token) {
    const session = await db.query(api.mcp.getSession, { token });
    if (!session) return new Response('Session expired; initialize again', { status: 404 });
    client = session.client;
  } else return new Response('Initialize an MCP session first', { status: 400 });
  const server = createMcpServer(db, origin, client);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request, { parsedBody: body });
  if (body.method === 'initialize' && response.ok && token) response.headers.set('mcp-session-id', token);
  await server.close();
  return response;
}
export function GET() { return new Response('Use POST for MCP requests', { status: 405, headers: { Allow: 'POST, DELETE' } }); }
export function DELETE() { return new Response(null, { status: 204 }); }
