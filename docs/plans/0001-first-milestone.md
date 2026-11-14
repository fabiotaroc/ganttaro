# Plan: first milestone

This is a hand-off plan for an agent starting with no prior context. It says what to build, in what order, and how to know each part is done. The design is settled: don't reopen decisions recorded here or in the ADRs without asking the user. If something here turns out to be impossible, stop and ask; don't work around it.

## Read first

1. [GLOSSARY.md](../../GLOSSARY.md): the domain language. Use these terms in code, tool names, UI copy and commits, and avoid the words listed under each _Avoid_.
2. [ADR 0001](../adr/0001-hosted-chart-is-source-of-truth.md): the hosted Chart is the only source of truth.
3. [ADR 0002](../adr/0002-field-level-edits-with-stale-agent-rejection.md): field-level edits, and Agent Edits based on stale data are refused.
4. [ADR 0003](../adr/0003-nextjs-on-vercel-with-convex.md): Next.js on Vercel, with Convex.
5. [ADR 0004](../adr/0004-build-chart-interactions-on-ui-sdk-beta.md): the UI SDK beta and the shape of the agent bridge.
6. [Spike findings](../spikes/0001-ui-sdk-gantt.md) and the [spike code](../../spikes/ui-sdk-gantt): a working UI SDK Gantt primitive to start from.

## What Ganttaro is

A hosted, shared Gantt chart. Each Chart has a secret **Edit Link** and **View Link**, and there are no accounts. People edit by hand in the browser. Agents edit through Ganttaro's **MCP server** from any harness, or through the **Agent Bridge** on an open Chart page. Every change is saved per field to Convex, pushed live to every open browser, and recorded as a **Revision**.

## Settled product rules

### Dates and time

- Only **Working Days** count: weekdays that aren't Holidays. **Weekends are never shown** on the chart.
- A **Task** stores start and end dates, both inclusive, and never a duration. A duration in Working Days is computed for display.
- A **Milestone** stores one date.
- Dates are ISO strings (`2026-11-16`). No times, no time zones.
- A start or end date on a weekend is **refused**.
- **Holidays** belong to each Chart and start with a preset of Italian public holidays. They show as greyed-out columns, and dragging snaps past them.
  - Adding a Holiday **never changes Item dates**; only durations change.
  - An Item that starts or ends on a Holiday is **flagged**.
- **Nothing ever moves dates on its own.** Dates change only when that Item is edited.

### Dependencies and Conflicts

- There is one kind of **Dependency**: finish → start.
- It is stored only on the later Item, as `after: [ids]`.
- An Item is in **Conflict** when it starts on or before the last Working Day of anything it comes after. If A ends Friday, B may start Monday at the earliest.
  - The exception is a Milestone: an Item that comes after it may start on the Milestone's own day.
- A Conflict is a visible warning, never an error.

### Refused vs flagged

- **Refused**: the edit is not applied, and the editor gets a clear reason. This covers:
  - a date on a weekend
  - an end before its start
  - a Dependency that points to a missing Item, points to the Item itself, or creates a loop
  - an unknown Group
- **Flagged**: the edit is saved and highlighted in the chart. This covers:
  - a Conflict
  - an Item that starts or ends on a Holiday
  - an Item with an empty name

### Structure

- **Items** have a fixed internal `id` (a short slug such as `api`, generated from the name and unique within the Chart) and a display `name`.
  - IDs are **never shown** to people. They appear only as hidden attributes on the page (`data-item-id`, plus the Chart ID) so annotations can resolve them.
- **Groups** are per-Chart colour categories with a name and a colour from a **fixed palette of about 8 colours**. An Item has at most one Group.
- **Owners** are plain names, and an Item can have several. They aren't linked to accounts.
- Each Item can have a **description** and **links**, shown on hover and editable in the details panel.
- **Row order** is the stored order and is never sorted automatically.
  - New Items created by hand are placed in a row near their date.
  - **Tidy** re-sorts the rows once, by start date, keeping chains of dependent Items together. It's saved as a normal Revision and can be undone.
- **Chart settings**: title, description, Holidays and default zoom (days, weeks or months). People can change the zoom freely without saving it; "Set as default zoom" saves it.
- **Out of scope:** Phases, progress, status, accounts, sign-in, notifications, deleting Charts, listing all Charts, and a raw source editor.

### Editing

- **Manual Edits** (people, in the browser):
  - rename, move, resize, create, delete and reorder Items
  - draw a Dependency by dragging from one bar's end to another bar's start, and delete one by clicking its arrow and pressing Delete
  - a "Comes after" Combobox in the details panel
  - details panel fields: description, Owners, Group, links
  - title and description, toggling a day column as a Holiday, Tidy, and "Set as default zoom"
  - **undo/redo**, and restoring a Revision
- **Agent Edit (MCP)** can do everything above, plus bulk changes.
- **Agent Edit (Bridge)** can do only what a person can do by hand in that Chart.
- Any change that a person didn't make by hand counts as an Agent Edit (Bridge). That includes UI SDK sources `agent` and `programmatic` (spike finding 4).

### Access

- An **Edit Link** can view and edit.
- A **View Link** can only view: the bridge only reads there, and every editing control is hidden.
- Both links are long and random.
- **Deleting an Item through the bridge** needs a person to confirm with a click.
- The home page has:
  - a **"New chart"** button, which creates an empty Chart and prompts you to copy both links
  - a **"Recent charts"** list stored in that browser's `localStorage`: title, when it was last opened, whether you hold the Edit or View Link, and "Remove from list", which doesn't delete anything

### Simultaneous edits (ADR 0002)

- Changes are written **field by field**. A rename and a date change to the same Item made at the same time both survive.
- **Manual Edits** apply immediately and are never refused for being stale.
- An **Agent Edit (MCP)** sends the `version` it read for each Item it changes. If any of those Items changed since, the whole call is **refused**, and the response contains the current state of those Items, so the agent can retry with `get_items`.
- **Presence**: open browsers show the people and agents currently editing, e.g. "Claude is editing 3 items". The MCP client name comes from the MCP `initialize` handshake.
- Every accepted change is a **Revision** that records:
  - the fields changed, with before and after values
  - the time
  - the kind: Manual, Agent (MCP) or Agent (Bridge)
  - the client name for agent edits
  - any Revision can be restored

### Export

- **PDF and PNG**, generated by our own code in the browser, not with the browser's print dialog.
- Same page size, margins and fonts in every browser. The PDF is landscape.
- Agents can't export in this milestone.

## Architecture

```
apps/web            Next.js (App Router) on Vercel
  app/              home, /c/[editKey], /v/[viewKey], /mcp route (Streamable HTTP MCP server)
  components/       shadcn/ui around the chart; the chart itself is UI SDK
convex/             schema, queries, mutations, presence
packages/core       pure TypeScript: no React, no Convex, no I/O
packages/chart      the UI SDK `gantt` primitive and its React parts
plugin/             Ganttaro skill + MCP connection config for Claude Code, Codex, Cursor
```

Use a pnpm or npm workspace monorepo, whichever the scaffold sets up most simply. Keep the spike folder; it isn't part of the build.

### `packages/core`: the shared rules

Everything that decides what a Chart *means* lives here. The browser, Convex functions and the MCP server all call these same functions. The core never imports Convex, so it can outlive ADR 0003. Provide:

- **Types** for Chart, Item (Task or Milestone), Group, Holiday and the compact JSON shape (below).
- **Working-day calendar**: from a date to its Working Day index and back, Working Days between two dates, the next or previous Working Day, and the Italian Holiday preset (fixed dates plus Easter Monday).
- **Validation**: given a Chart and a proposed change, return `{ ok: true, flags }` or `{ ok: false, reasons }`, using the refused/flagged lists above.
- **Conflicts**: the full set for a Chart, and the set caused by a change.
- **Cycle detection** for Dependencies.
- **ID generation**: a slug from the name that is unique within the Chart.
- **Tidy**: a stable sort by start date that keeps dependency chains together.
- **Layout**: x and width in Working Day columns, plus row index for each bar, for each zoom level. Rendering and export both use it.
- **Compact JSON**: serialise a Chart for agents, and apply a list of changes.

Every function is deterministic, with unit tests (Vitest).

### Compact JSON (agents read and write this)

There is no YAML anywhere. One shape is used for reading and for writing. For example:

```json
{
  "chart": { "id": "ch_…", "title": "Leadabeelity rollout", "version": 42, "zoom": "weeks" },
  "holidays": ["2026-12-08", "2026-12-25"],
  "groups": [{ "id": "datapizza", "name": "Datapizza", "color": "indigo" }],
  "items": [
    { "id": "kickoff", "name": "Kickoff", "on": "2026-11-16", "version": 3 },
    { "id": "api", "name": "Build API", "start": "2026-11-17", "end": "2026-11-28", "after": ["kickoff"], "group": "datapizza", "owners": ["Marco"], "version": 7 }
  ],
  "conflicts": [{ "item": "api", "after": "kickoff" }],
  "flags": []
}
```

- The list of `items` is in row order.
- A Milestone has `on`; a Task has `start` and `end`.
- Omit empty fields.
- `description` and `links` are left out of `get_chart` and returned by `get_items`. That keeps whole-Chart reads small.

### Convex data model

Store each Chart as structured records. Never store it as a text document. Suggested tables:

- **`charts`**: title, description, editKey, viewKey, defaultZoom, holidays, and an ordered list of Item ids (row order).
- **`items`**: chartId, itemId (the slug), kind, name, start/end or on, after, group, owners, description, links, and a version per Item.
- **`groups`**: chartId, groupId, name, color.
- **`revisions`**: chartId, kind, client, timestamp, and the changes as field-level diffs. Restoring a Revision applies its inverse, or rebuilds the Chart as it was at that point, as a new Revision.
- **presence**: use Convex's presence component.

Every write goes through **one Convex mutation path** that does three things: checks edit access from the editKey, calls `packages/core` validation, and records a Revision. Browsers never write tables directly. With no accounts, the editKey is the credential: pass it with every mutation and check it on the server.

### MCP server

- Use the Streamable HTTP transport at `/mcp`, inside the Next.js app.
- Auth: none. Every tool takes a Chart link or key (ADR 0001, plus "no listing" from the design).
- Tools are small and targeted. Each returns the Conflicts and flags its change caused.

| Tool | Does |
|---|---|
| `create_chart` | Creates a Chart from compact JSON or a short spec. Returns the Edit Link, the View Link and the Chart |
| `get_chart` | Returns the whole Chart as compact JSON, in one call |
| `get_items` | Returns the named Items in full, including description and links, for re-reads after a refusal |
| `add_items` / `update_items` / `delete_items` | Field-level changes. `update_items` and `delete_items` take the `version` each Item had when read, and are refused if any is stale |
| `apply_changes` | A bulk list of add, update and delete changes in one call, also version-checked |
| `set_dependencies` | Adds or removes Dependencies, refused on loops |
| `set_holidays` | Adds or removes Holidays |
| `tidy` | Runs Tidy |
| `update_chart` | Title, description, default zoom |
| `restore_revision` | Restores an earlier Revision |

Deleting through MCP needs no confirmation; it's recorded as a Revision, so it can be undone.

### The chart UI (`packages/chart`)

Build on the spike's `gantt` primitive (`spikes/ui-sdk-gantt/src/gantt.ts`). It's an excellent base, but fix these gaps:

1. Use **real dates** at the edges of the primitive. Working Day indexes stay internal, and the core converts.
2. Add Milestones (a diamond), Groups (colours), the details panel, creating and deleting Items, the "today" line, Holiday columns you can click, zoom levels, undo/redo, and presence badges.
3. **Accessibility**: pick an APG pattern (probably `grid`), declare roles on slots, and support the keyboard throughout. The spike skipped this.
4. **Agent Bridge** (ADR 0004):
   - The whole Chart is **one** bridge component labelled `Chart`.
   - Its actions mirror the MCP tools.
   - Its state is the compact JSON for Charts up to about 60 Items. Above that, show a short summary, and add a `describe` action that returns the full JSON.
   - Register it with WebMCP (`registerTools`) and also expose it on `window`.
   - On View Links, only read actions.
   - `remove` needs a person's confirmation through `allow`.
5. Map UI SDK change sources: `pointer` and `keyboard` are Manual Edits; `agent` and `programmatic` are Agent Edit (Bridge).
6. Keep bars moving only horizontally: force `track` back to the Item's id (spike finding 3).
7. Every bar carries hidden `data-item-id` and `data-chart-id` attributes for annotations. The hover card has a "Copy link to this item" button.

Use shadcn/ui for everything around the chart: header, dialogs, forms, buttons and the home page.

The UI SDK is a beta. Read `node_modules/@ui-sdk/react/docs/llms.txt` and the installed `ui-sdk` skill before writing UI SDK code. Don't read its compiled JavaScript.

### Plugin (`plugin/`)

- **A Ganttaro skill** for agents. It should cover:
  - the compact JSON format
  - the Working Day rules, Conflicts, and refused vs flagged
  - "list Items in date order, and keep dependency chains together"
  - "reuse `version` from your last read, and on a refusal call `get_items` and retry"
  - "in a browser, use the `Chart` bridge actions, not simulated clicks"
  - "resolve annotated elements through `data-item-id`"
- **MCP connection config** for Claude Code (a plugin marketplace repo), Codex (MCP by URL) and Cursor (an MCP entry), plus `npx skills add` for other harnesses.
- An install guide with each harness's exact steps. **Check them against current docs**; don't trust memory.
- Marketplace listings are out of scope.

## Build order

Work in this order. Each step ends with its tests passing and a commit.

1. **Scaffold.**
   - Set up the monorepo, a Next.js app and Convex dev deployment, shadcn/ui, Vitest, and the UI SDK packages with its skill (`npx skills add vercel-labs/ui --skill ui-sdk`).
   - Add an `AGENTS.md` that points to the glossary, the ADRs, this plan and the UI SDK docs note.
   - Link a Vercel project, but **ask the user before provisioning Convex** through the Vercel Marketplace. It's a billing and account step.
2. **`packages/core`**, with thorough unit tests. The worked examples in "Settled product rules" make good test cases. Include:
   - the Friday → Monday Conflict
   - a Dependency on a Milestone starting the same day
   - adding a Holiday shortens a duration but keeps the dates
   - a weekend date is refused
   - loops are refused
   - Tidy is stable
   - the Italian Holidays are correct, including Easter Monday 2027 (29 March)
3. **Convex schema and mutations.** Cover:
   - field-level writes
   - version checks for Agent Edit (MCP)
   - Revisions and restoring them
   - Edit Link vs View Link access
   - presence
   Test them with `convex-test`.
4. **MCP server** at `/mcp` with the tool set above. Test it with an MCP client script: create, read, update, a stale refusal and retry, and restore.
5. **Chart UI.** Move the spike primitive into `packages/chart` with the fixes listed above. Build the Chart page at `/c/[editKey]` and `/v/[viewKey]`, wired to Convex live queries and mutations.
6. **Home page**: "New chart" and "Recent charts".
7. **Agent Bridge.** Add tests in the style of the spike's `gantt.test.tsx`: the snapshot, every action, the View Link read-only rule, the delete confirmation, the 60-Item cutoff, and source tagging.
8. **PDF/PNG export**, done by our own code in the browser. Choose a library that renders the layout from `packages/core` directly, for example SVG to PDF. Check that the output is identical across Chrome and Safari.
9. **Plugin**: the skill, connection configs and install guide.
10. **Deploy a Vercel preview** and run the milestone scenario below end to end.

## Acceptance: the milestone scenario

The milestone is done when all seven steps pass on a deployed preview.

1. From Claude Code, an agent calls `create_chart` from a short brief. The Chart has about 10 Items, 2 Groups, a few Dependencies, and an Italian Holiday inside its range. The agent gets back the Edit Link and the View Link.
2. You open the Edit Link:
   - Weekends are hidden, the Holiday is greyed out, and the "today" line shows.
   - You drag a task so it starts before the task it depends on, and a Conflict appears.
   - You draw a Dependency by hand between two other Items. A drawn Dependency that would make a loop is refused.
3. A colleague has the View Link open and sees your changes live, but can't edit.
4. You annotate a bar in an in-app browser and ask the agent to "make this one 2 days shorter". The agent does an Agent Edit (MCP) using the hidden ID. Your view updates live, and presence shows the agent working.
5. While the agent is working, you rename that same Item by hand. The agent's later change to it is refused as stale; it re-reads and retries. Both changes survive.
6. A browser agent does one Agent Edit (Bridge) that adds a Dependency through the bridge. Use WebMCP in the ChatGPT/Codex browser, or `window` in T3. The history shows it apart from the MCP edit. You then restore an earlier Revision.
7. You export a PDF and a PNG, and they look identical in Chrome and Safari.

## Known facts and caveats

- The UI SDK is `@ui-sdk/*` **0.1.0-beta.1** on npm as of November 2026. Pin exact versions, and expect API changes.
- **WebMCP support:**
  - Works in the ChatGPT/Codex desktop built-in browser, with GPT-5.6 Sol/Terra only and not in Enterprise or Edu workspaces.
  - Not in T3's in-app browser; T3 uses the `window` route.
  - Not through Codex's Chrome connector.
  - Claude Code and Cursor need Playwright CLI/MCP or Vercel `agent-browser` with a Chrome that has WebMCP enabled.
  - Not yet verified: Cursor's built-in browser.
- A UI SDK snapshot lists at most 10 items inline; more come back through `query({ within })`. That's why the bridge state carries the compact JSON itself.
- **Not verified yet**, so check before relying on them:
  - the Convex presence component's current API
  - the exact MCP SDK and transport setup in the Next.js version you scaffold
  - each harness's plugin install steps

## Working rules

- Use the glossary terms everywhere. If a new domain concept appears, add it to `GLOSSARY.md`. Glossary entries contain no implementation details.
- Add an ADR only for decisions that are hard to reverse, surprising, and the result of a real trade-off (see `docs/adr`).
- Don't add features outside the milestone without asking, especially accounts, Phases, progress tracking or automatic scheduling.
- Never print or commit secrets. Ask the user before any step that involves billing, accounts or provisioning.
- Commit after each build-order step and push to `origin main` (github.com/fabiotaroc/ganttaro, private), unless the user asks for branches or PRs.
