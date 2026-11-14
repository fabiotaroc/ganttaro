# Next.js on Vercel with Convex as the database

The chart pages and the hosted MCP server are one Next.js app deployed on Vercel, and Charts are stored in Convex. Convex pushes changes to every open browser, runs each write as a single transaction (which makes refusing stale Agent Edits from ADR 0002 straightforward), and offers presence. Postgres options would have needed us to build change broadcasting, presence and version checks ourselves.

## Considered Options

- **Supabase (Postgres + Realtime):** portable SQL, but more realtime and version-check plumbing, and with no accounts every write would have to go through our server anyway.
- **Neon Postgres plus our own WebSocket layer:** the most control and the most code.

## Consequences

Server-side logic is written as Convex functions, so moving off Convex later means rewriting the data layer. The shared core library (validation, working-day maths, Conflicts) stays free of Convex so it can move with us.
