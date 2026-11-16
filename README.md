<p align="center">
  <img src="plugin/assets/logo.svg" alt="Ganttaro logo" width="80" height="80" />
</p>

<h1 align="center">Ganttaro</h1>

**A shared Gantt chart for people and AI agents.**

Plan a project in your browser, or ask an agent to build and update the timeline
for you. Everyone works on the same live Chart, with no sign-up required.

**[Open Ganttaro →](https://ganttaro.vercel.app)**

## What you can do

- Add Tasks and Milestones, set dates, and draw Dependencies.
- Organize work with Groups, Owners, descriptions, and links.
- Plan around Working Days and Holidays. Conflicts are highlighted; dates never move automatically.
- Collaborate live, share a View Link, and restore earlier Revisions.
- Export your Chart as a PDF or PNG.
- Ask Codex, ChatGPT Work on desktop, Claude Code, or Cursor to create and edit Charts through MCP.

Each Chart has an **Edit Link** and a **View Link**. Anyone with the Edit Link can
make changes; the View Link only allows viewing. Keep the Edit Link private and
save both links somewhere you can find them again.

## Setup prompt

### Codex / ChatGPT Work

Paste this into **Codex or ChatGPT Work in the desktop app**:

```text
Install the Ganttaro plugin from https://github.com/fabiotaroc/ganttaro.
Run:
  codex plugin marketplace add fabiotaroc/ganttaro
  codex plugin add ganttaro@ganttaro

Verify installation with `codex plugin list`.
Tell me if I need to start a new session or restart the desktop app
to load its skill and MCP tools.
```

### Claude Code

Paste this into **Claude Code**:

```text
Install the Ganttaro plugin from https://github.com/fabiotaroc/ganttaro.
Run:
  claude plugin marketplace add fabiotaroc/ganttaro
  claude plugin install ganttaro@ganttaro --scope user

Verify installation with `claude plugin list`.
Tell me if I need to start a new session to load its skill and MCP tools.
```
### Cursor

Open **Customize → Plugins → Browse Marketplace → Add Marketplace → Import from GitHub**.
Import `https://github.com/fabiotaroc/ganttaro`, install **ganttaro**, then start a
new Agent chat. The plugin includes both the skill and the MCP connection.

### Try it

The plugin includes the Ganttaro skill and a connection to the hosted MCP server.
You don't need to clone this repository, run a server, or configure an API key.
Start a new session after installing. In ChatGPT Work, restart the desktop app
if the plugin doesn't appear. Then try:

```text
Use Ganttaro to create a Chart for a two-week website launch starting next Monday.
Include design, implementation, review, and a launch Milestone, with Dependencies.
Give me the Edit Link and View Link.
```

To update an existing Chart, include its Edit Link in your request. For a summary
without editing access, use its View Link. Changes appear live in the browser.


### Other MCP clients

Connect to `https://ganttaro.vercel.app/mcp` using **Streamable HTTP**. No MCP login
is required; access to each Chart comes from its Edit Link or View Link.
The [Ganttaro skill](plugin/skills/ganttaro/SKILL.md) explains the tools and scheduling rules.

Installation references: [Codex](https://learn.chatgpt.com/docs/developer-commands#codex-plugin),
[Claude Code](https://code.claude.com/docs/en/plugins/install),
[Cursor](https://cursor.com/docs/plugins), and
[ChatGPT and Codex plugins](https://learn.chatgpt.com/docs/plugins).

## Development

Ganttaro uses Next.js, React, Convex, and the UI SDK in an npm workspace.
You need **Node.js 24 or newer**, npm, and a Convex development deployment.

```sh
git clone https://github.com/fabiotaroc/ganttaro.git
cd ganttaro
npm ci
npm run convex:dev
```

Follow the Convex setup prompts for your own development deployment. Set
`NEXT_PUBLIC_CONVEX_URL` in `apps/web/.env.local` to that deployment's client URL
(see [the example](apps/web/.env.example)). Keep `convex:dev` running, then start
the web app in another terminal:

```sh
npm run dev
```

Open `http://localhost:3000`. This repository configures a `ganttaro-local` MCP
server at `http://localhost:3000/mcp` for Codex, Claude Code, Cursor, and OpenCode.
Approve or trust the project when your harness asks. This connection uses your
local app; the installed plugin connects to the hosted app.

Run the checks with:

```sh
npm test
npm run lint
npm run build
```

### Repository layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Browser app, Chart pages, exports, and hosted MCP server |
| `convex` | Persistence, live updates, presence, and Revisions |
| `packages/core` | Shared scheduling rules and validation, with no framework or I/O dependencies |
| `packages/chart` | Chart interactions and Agent Bridge |
| `plugin` | Agent skill and plugin manifests for supported harnesses |
| `docs` | Architecture decisions, plans, and spike findings |
| `spikes` | Experiments, excluded from the workspace build |

### Deployment

Deploy the Next.js app to Vercel with `apps/web` as the root directory and sources
outside that directory included. Use `cd ../.. && npm ci` as the install command
and `cd ../.. && npm run build:vercel` as the build command. Supply the appropriate
Convex deploy key for each environment; the build injects `NEXT_PUBLIC_CONVEX_URL`.
Use separate Convex deployments for Preview and Production.

Integration checks create verification Charts in the backend you point them at:

```sh
node scripts/test-mcp.mjs http://localhost:3000/mcp
node scripts/test-browser.mjs http://localhost:3000
```

The browser check requires Google Chrome. For a protected Vercel preview, run
`vercel env pull .env.vercel.local`, then pass `--env-file=.env.vercel.local` to
Node and replace the local address with the preview address. The scripts send
that token only to that Vercel origin. Keep credentials and verification Chart
links out of git.

## Contributing

Issues and pull requests are welcome. Before making changes, read
[AGENTS.md](AGENTS.md), the [glossary](GLOSSARY.md), and the
[architecture decisions](docs/adr). The
[milestone plan](docs/plans/0001-first-milestone.md) and
[progress notes](docs/plans/0001-progress.md) describe the current scope and
remaining verification work.

Keep scheduling rules in `packages/core` so the browser and agents use the same
validation. For UI SDK changes, follow the documentation steps in AGENTS.md.
