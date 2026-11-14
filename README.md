# Ganttaro

A hosted, shared Gantt chart that people edit by hand and agents edit through MCP or the in-browser agent bridge.

- [GLOSSARY.md](GLOSSARY.md): the domain language
- [docs/adr](docs/adr): architecture decisions
- [docs/spikes](docs/spikes): spike findings
- [spikes/](spikes): throwaway spike code

## Development

Use Node 24 or newer and npm workspaces. Run `npm ci` at the repository root.
The spike is excluded from workspace commands.

The Vercel project is `taros-projects-eccc3646/ganttaro`, with `apps/web` as its
root directory. Convex is connected through the Marketplace in the same team.

Run `npm run convex:dev` in one terminal and `npm run dev` in another. Set
`NEXT_PUBLIC_CONVEX_URL` in `apps/web/.env.local` to the development deployment's
client URL. Deployment selection and credentials stay in ignored env files.

Run `npm run build`, `npm run lint`, and `npm test` for checks.
See [milestone progress](docs/plans/0001-progress.md) for remaining work.

## Deployment and agent installation

Vercel uses Node 24, project root `apps/web`, sources outside that directory
included, install command `cd ../.. && npm ci`, and build command
`cd ../.. && npm run build:vercel`. The Marketplace supplies the environment's
Convex deploy key; the build injects `NEXT_PUBLIC_CONVEX_URL` for Next.js.
Preview and Production use separate Convex deployments.

See [the plugin install guide](plugin/README.md) for Claude Code, Codex and Cursor.

Integration checks (they create verification Charts in the selected backend):

```sh
node scripts/test-mcp.mjs http://localhost:3103/mcp
node scripts/test-browser.mjs http://localhost:3103
```

The browser check uses installed Google Chrome. For a protected Vercel preview,
refresh a local development OIDC token with `vercel env pull .env.vercel.local`,
then run either script with Node's `--env-file=.env.vercel.local` and the preview
address. The scripts send that token only to the Vercel origin. Credentials and
verification Chart links stay in ignored env files or private temporary files.
