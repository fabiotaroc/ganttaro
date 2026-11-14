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
