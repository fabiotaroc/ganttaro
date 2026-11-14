# Build the chart's interactions on the UI SDK beta, agent bridge included

The chart's interactive parts (bars, dragging, resizing, reordering, the details panel) are built from Vercel's UI SDK behaviours, with its agent bridge switched on, so that agents in a browser can read and act on the chart directly. We chose this while the UI SDK was a two-day-old beta (0.1.0-beta, November 2026): it matches our interactions closely, and building on it from the start means its improvements arrive without a rewrite. shadcn/ui covers everything around the chart. A short spike comes first, to find gaps early.

## Consequences

Beta API changes will cost us upgrade work. Edits from the agent bridge must follow the same rules as every other Agent Edit: validation, staleness checks and Revisions.
