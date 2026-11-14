# First milestone progress

1. Scaffold complete: npm workspace, Next.js App Router, shadcn/ui, exact UI SDK
   beta dependencies and skill, Vitest and Convex tooling. Vercel project
   `taros-projects-eccc3646/ganttaro` is linked to GitHub with `apps/web` as its root.
   Convex is connected through that project's Marketplace integration for
   Production and Preview. Cloud development deployment `blissful-axolotl-137`
   is configured under Convex team `taro-s-projects`.
   Verified: Convex dev --once, Next.js production build, ESLint, Vitest runner
   with no tests yet, and git diff --check.

2. Shared core complete: calendar, validation, Conflicts, cycle detection, IDs,
   stable Tidy, shared layout, compact JSON, field changes and diffs.
   Verified: 26 Vitest cases and strict TypeScript checking.

3. Convex storage complete: structured Chart, Item, Group and Revision records;
   one authorised mutation path; stale Agent Edit rejection; restore and inverse
   restoration; Edit/View Link access; Convex presence component.
   Verified: 34 tests total, Convex TypeScript, successful cloud deployment, and
   live development create/Agent Edit/View Link read.

4. Streamable HTTP MCP server complete at /mcp with all planned tools and
   list_revisions for discovering restore targets. Handshake client names persist
   across requests through expiring Convex MCP sessions.
   Verified: scripts/test-mcp.mjs against the running Next.js production server
   and live development backend: create/read/update/stale refusal/retry/restore,
   client attribution and View Link write refusal. Build, lint and 34 tests pass.

5. Chart UI implemented at /c/[editKey] and /v/[viewKey], with live Convex
   reads, UI SDK spans/reordering/connections/inline editing, real-date inputs,
   Milestones, Groups, details, Holidays, zoom, Revisions, undo/redo and presence.
   View Links expose details without editing controls.
   Verified: production build, ESLint and 37 tests, including grid rendering,
   keyboard movement over Holidays, source tagging and View Link restrictions.
   Browser interaction verification remains part of the deployed scenario.

6. Home page complete: New chart creates an empty hosted Chart and prompts to
   copy both secret links. Recent charts records title, opening time and access
   in localStorage; removing an entry only changes that browser list.
   Verified: production build, ESLint and 37 tests.

7. Agent Bridge complete: one Chart control, compact state through 60 Items,
   summary plus describe above 60, WebMCP registration and window.ganttaro.
   View Links expose read actions only. Deletion (and restoration which may
   delete Items) waits for a person to click confirmation through allow.
   Verified: 40 tests, every advertised action, cutoff, refusal/confirmation,
   source tags and a keyboard-interaction mutation check. Build and lint pass.

8. Browser PNG/PDF export implemented from core layout using bundled IBM Plex
   Sans and resvg WebAssembly; PDF embeds the same raster on a fixed landscape
   page. Exports are absent from agent actions.
   Verified: 42 tests, deterministic PNG bytes, PDF landscape dimensions, actual
   Chrome downloads and visual inspection. Safari comparison is pending because
   Safari currently refuses WebDriver until Allow remote automation is enabled.
   Additional Chrome checks passed: hidden weekends, live View Link, Manual
   rename, Bridge Dependency and distinct Revision kinds.

Steps 9–10 and the deployed acceptance scenario remain.
