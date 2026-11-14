# First milestone verification

Verified on 14 November 2026. Implementation commit: `8e49eb4`.

- Preview: https://ganttaro-cloa2vsiz-taros-projects-eccc3646.vercel.app
- Vercel deployment: `dpl_D2uMbwmx5sT79jtBiNhLdhGRQ4fd`, READY.
- Vercel team/project: `taros-projects-eccc3646/ganttaro`.
- Preview Convex deployment: `taro-s-projects:ganttaro:preview/main`,
  `tremendous-ocelot-812`. Development uses `blissful-axolotl-137`.
- Production and Preview are connected through the project's Convex Marketplace
  integration. Pushes to main deploy Production through the Git integration.

## Checks passed

- 43 Vitest cases: shared calendar and Chart rules; Convex access, concurrent
  field changes, stale refusal, restoration and presence; UI keyboard behavior;
  Agent Bridge actions and permissions; export rendering.
- Next.js production build, ESLint, strict Convex and core TypeScript checks.
- Claude plugin and marketplace manifests validate. The skill validator passes,
  and the skills CLI discovers the Ganttaro skill.
- The keyboard movement test was checked by temporarily disabling movement:
  it failed as expected, and passed after restoring the implementation.
- Live development create, Agent Edit and View Link read.

## Deployed MCP check

`node --env-file=.env.vercel.local scripts/test-mcp.mjs <preview>/mcp`
passed against the preview above. It verified:

- initialize handshake, all 13 tools, and persisted client-name attribution;
- creating from the compact JSON shape, reading through a View Link;
- updating fields, refusing stale versions and returning current Items;
- rereading and retrying while preserving a rename;
- restoring an earlier Revision using current Item versions;
- refusing a write through a View Link.

The client was the official MCP TypeScript SDK. It was not a Claude Code model run.

## Deployed Chrome check

`node --env-file=.env.vercel.local scripts/test-browser.mjs <preview>`
passed against the preview above using installed Google Chrome. The fixture has
10 Items, two Groups, Dependencies and the Italian Holiday of 8 December.

| Scenario | Result |
| --- | --- |
| Weekends hidden; Holiday column visible | Passed |
| Separate View Link receives live Manual Edits; no editing controls | Passed |
| Diagonal Task drag remains on its Item and creates a visible Conflict | Passed |
| Dependency drawn by pointer; looping Dependency refused with a reason | Passed |
| Manual rename followed by stale MCP date edit, reread and retry | Passed; both changes survive |
| Agent Edit through window.ganttaro adds a Dependency | Passed; separate Agent (Bridge) Revision |
| Programmatic DOM deletion waits for confirmation | Passed; cancellation preserves the Item |
| Bridge removal after a person-click confirmation | Passed |
| Restore a Revision, then Undo and Redo | Passed; View Link updates live |
| PNG and PDF downloaded in the browser | Passed |
| New chart shows distinct Edit and View Links | Passed |
| Remove from Recent charts preserves the hosted Chart | Passed |

No page errors were reported. Chart rendering and exports were inspected visually.
The PDF and PNG use the same bundled-font WASM raster. Their dimensions match
when the PDF is rendered at 192 DPI (2240 × 1584). Poppler's PDF rendering adds
small pixel differences; the layout and content match visually. Repeated direct
WASM renders produce identical PNG bytes.

## Pending acceptance checks

- **Exact Claude Code agent scenario:** the T3 Claude provider reports
  `Provider instance is disabled`. No other provider or CLI model was substituted.
  Plugin packaging and protocol behavior pass, but the literal short-brief
  Claude Code run and annotated natural-language interaction remain unverified.
  Agent presence while a model is planning was not visually verified; the
  presence component and client-name attribution were tested separately.
- **Safari export comparison:** explicitly left pending at the user's request.
  Safari WebDriver refused sessions until Allow remote automation is enabled.

These pending checks mean the plan's literal seven-step acceptance scenario has
not been claimed complete.

## Reproducing

See the root README for local setup and Vercel build settings, and plugin/README.md
for each harness's installation. Verification scripts create disposable test
Charts in the selected backend. The app intentionally has no Chart deletion.
Preview access uses the linked project's short-lived development OIDC token,
sent only to that Vercel origin. No credentials or secret Chart links are stored
in this report or committed to the repository.
