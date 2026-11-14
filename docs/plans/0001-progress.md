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

Steps 6–10 and the deployed acceptance scenario remain.
