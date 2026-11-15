import { Presence } from '@convex-dev/presence';
import { v } from 'convex/values';
import { components } from './_generated/api';
import { mutation, query } from './_generated/server';
import { access } from './charts';
const presence = new Presence(components.presence);
export const heartbeat = mutation({
  args: { roomId: v.string(), userId: v.string(), sessionId: v.string(), interval: v.number() },
  handler: async (ctx, args) => {
    const chart = await access(ctx, args.roomId);
    if (
      args.userId.length > 160 ||
      args.sessionId.length > 160 ||
      args.interval < 1000 ||
      args.interval > 30000
    )
      throw new Error('Invalid presence');
    return presence.heartbeat(ctx, chart._id, args.userId, args.sessionId, args.interval);
  },
});
export const list = query({
  args: { roomToken: v.string() },
  handler: (ctx, args) => presence.list(ctx, args.roomToken),
});
export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: (ctx, args) => presence.disconnect(ctx, args.sessionToken),
});
