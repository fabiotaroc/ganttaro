# Separate portable export data from compact JSON

Ganttaro keeps two JSON projections of a Chart in `packages/core`: `compact()` for Ganttaro's own MCP server and Agent Bridge, and `exportData()` for one-way user exports pasted into external agents (PowerPoint, Google Slides, Figma, etc.). We chose two projections instead of reusing `compact()` directly because `compact()` carries internal bookkeeping (`chart.id`, `version` numbers, slug IDs, `flags`, unused Groups, and full-year Holidays) needed for version-checked mutations, whereas an external visualization agent needs a self-explanatory, ID-free visual brief with explicit Item types, timeline bounds, `weekends: "hidden"`, pre-computed Working Days, in-range Holidays, and display-name references. Keeping the export projection read-only and one-way aligns with ADR 0001 and stays cheap to maintain as a pure function over `Chart`.

## Considered Options

- **Export `compact()` verbatim:** simpler, and pasteable back into `create_chart`, but leaks internal IDs and versions while omitting timeline bounds, Working Day counts, and weekend rules that external slide agents need.
- **Add export-only fields to `compact()`:** bloats every MCP and Agent Bridge read with redundant data.
