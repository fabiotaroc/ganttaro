# Shared Chart rules

Pure TypeScript; no React, Convex or I/O. Public functions are exported by src/index.ts.
Working Day indexes exclude Holidays; layout columns include all weekdays so
Holidays remain visible. Date ranges and durations are inclusive. The layout is
shared by interactive rendering and export.

Tidy groups connected Dependency chains together, sorts each chain by start date,
and sorts chains by their earliest start. Equal dates retain their previous order.
Tidy changes row order only.

The Italian preset includes national weekday Holidays, including Easter Monday.
4 October applies from 2026 under [Law 151/2025](https://www.gazzettaufficiale.it/eli/id/2025/10/10/25G00153/sg).
Weekend Holidays are omitted because weekends are never displayed. Local patron
saint Holidays can be added to a Chart explicitly.
