# Build the chart's interactions on the UI SDK beta, agent bridge included

The chart's interactive parts (bars, dragging, resizing, reordering, the details panel) are built from Vercel's UI SDK behaviours, with its agent bridge switched on, so that agents in a browser can read and act on the chart directly. We chose this while the UI SDK was a two-day-old beta (0.1.0-beta, November 2026): it matches our interactions closely, and building on it from the start means its improvements arrive without a rewrite. shadcn/ui covers everything around the chart. A short spike comes first, to find gaps early.

## Bridge shape (after the spike)

- **One control for the whole Chart.** The bridge shows the Chart as a single `Chart` component whose actions take an Item's ID or name and mirror the MCP tools. We rejected one control per bar: it would exceed the 100-control snapshot limit and make agents match handles to bars.
- **Same data as MCP.** The Chart's bridge state is the compact JSON that `get_chart` returns, with real dates. Charts over about 60 Items show a short summary instead, plus a `describe` action that returns the full JSON.
- **Reachable from page code.** The bridge is registered with WebMCP where the browser supports it, and also exposed on `window` so that agents in harness browsers without WebMCP (T3, probably Cursor) can use it. View Links stay read-only, deletions need a person's confirmation, and the usual validation applies.

## Consequences

Beta API changes will cost us upgrade work. Edits from the agent bridge must follow the same rules as every other Agent Edit: validation, staleness checks and Revisions. A change that didn't come from a person's own input (an `agent` or `programmatic` source in the UI SDK) is recorded as an Agent Edit (Bridge), never as a Manual Edit.
