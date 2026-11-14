import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
export const createSession = mutation({ args: { token: v.string(), client: v.string() }, handler: async (ctx, args) => {
  if (!/^[a-f0-9-]{36}$/.test(args.token) || args.client.length > 160) throw new Error('Invalid MCP session');
  const id = await ctx.db.insert('mcpSessions', { ...args, expires: Date.now() + 86400000 });
  await ctx.scheduler.runAfter(86400000, internal.mcp.expire, { id });
} });
export const getSession = query({ args: { token: v.string() }, handler: async (ctx, args) => {
  const session = await ctx.db.query('mcpSessions').withIndex('by_token', q => q.eq('token', args.token)).unique();
  return session && session.expires > Date.now() ? { client: session.client } : null;
} });
export const expire = internalMutation({ args: { id: v.id('mcpSessions') }, handler: async (ctx, args) => { await ctx.db.delete(args.id); } });
