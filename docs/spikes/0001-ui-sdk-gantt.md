# Spike: UI SDK beta for the Chart, and WebMCP support

November 2026. Code in [spikes/ui-sdk-gantt](../../spikes/ui-sdk-gantt). Versions tested: `@ui-sdk/core` and `@ui-sdk/react` 0.1.0-beta.1 (the latest on npm), React 19, Vite.

## Verdict

The UI SDK covers every chart interaction we need. One primitive, `gantt`, composes `createSpans`, `createReorder`, `createConnect` and `createInlineEdit`. Each was verified in a real browser (T3's in-app Chromium) and with the agent bridge in jsdom tests.

## What works

| Interaction | Behaviour | Result |
|---|---|---|
| Move a Task | `createSpans` | Works. Units are Working Day indexes, so weekends never appear. |
| Resize from either end | `createSpans` (`data-span-edge`) | Works |
| Reorder rows | `createReorder` on row labels | Works, pointer and keyboard |
| Draw a Dependency | `createConnect`, out-port to in-port | Works. Loops are refused in `canConnect`. |
| Rename | `createInlineEdit` (double-click, Enter, Escape) | Works |
| Conflicts and holidays | our own rendering | Conflicts turn red, and holidays are hatched columns |
| Agent Edit (Bridge) | `definePrimitive` `agent.actions` | `setDates`, `rename`, `remove`, `addDependency`, `removeDependency` all work through `agent.act`. Changes arrive with `details.source === "agent"`. |
| Confirming deletions | `createAgent({ allow })` | `remove` is refused until a person approves it |
| Rules reach the agent | errors thrown in actions | For example, "Kickoff after Go-live would create a loop" comes back as the step error |

## Surprises and decisions to revisit

1. **The whole Chart is one bridge component, not one per bar.** A custom primitive shows up in `snapshot()` as a single component (`"Chart"`) with its actions and Items. At 150 Items the snapshot stayed at 126 characters, because Items move to `query({ within: "Chart" })` once there are more than 10. That makes the 100-component cap irrelevant. It replaces the earlier "one bar, one bridge control" decision.
2. **The snapshot shows only `value` (id) and `label` (name) for each Item.** A browser agent can't see dates or Dependencies unless we expose them, either as `controlled` state or as a read action such as `describe`. This needs deciding before the real build.
3. **`createSpans` treats vertical pointer movement as a track change.** Refusing it made slightly diagonal drags snap back. The fix is to force `track` back to the Item's own id in `set`.
4. **The source tag depends on the event.** Synthetic DOM events, such as an agent dispatching pointer events, report `source: "programmatic"`. Only `agent.act` reports `"agent"`. Revisions have to treat `"programmatic"` carefully, so that a browser agent driving the DOM directly isn't recorded as a Manual Edit.
5. **Accessibility isn't finished.** The `focus` and `keys` slot fields need a declared role. The spike left bars and labels without proper roles; the real build needs an APG pattern, probably a grid.
6. **Rendering pattern.** The root exposes state to React through a slot `state` function, and the markup renders from `children(state)`, including the drag draft. Dependency arrows are plain SVG computed from indexes.

## WebMCP support by harness

| Harness / browser | WebMCP | Bridge route |
|---|---|---|
| T3 Code in-app browser (Electron, Chromium 152) | **No**: `document.modelContext` is undefined | Running JavaScript in the page works: `window.agent.act(...)` was verified |
| ChatGPT / Codex desktop built-in browser | **Yes** ("Site tools", since 25 Aug 2026), with GPT-5.6 Sol/Terra only, not Enterprise/Edu workspaces | WebMCP |
| Codex through the Chrome connector | No ([openai/codex#57853](https://github.com/openai/codex/issues/57853)) | — |
| Claude Code, Cursor (agent side) | No native support | Through Playwright CLI/MCP (`webmcp-list` / `webmcp-call`) or Vercel `agent-browser`, in a Chrome with WebMCP enabled |
| Cursor's built-in browser | Unverified | — |
| Chrome | Origin trial from 149, or `chrome://flags/#enable-webmcp-testing` | Only the browser's own agent consumes the tools |

Implication: Agent Edit (MCP) stays the main route. The bridge reaches ChatGPT/Codex users through WebMCP, and reaches T3 (and probably Cursor) users when the agent runs JavaScript in the page. Supporting that second route means deliberately exposing the bridge on `window`, which is a decision still to make.
