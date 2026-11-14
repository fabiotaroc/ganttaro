---
name: ganttaro
description: Read, create and edit hosted Ganttaro Charts through their MCP tools or the open Chart Agent Bridge. Use for Ganttaro links, Items, Dependencies, Holidays and Revisions.
---

# Ganttaro

Use the hosted Chart as the source of truth. An Edit Link permits changes; a
View Link permits reads only. There are no accounts or Chart-listing tools.

## Read and edit

1. Call `get_chart` with the Chart link. Call `get_items` for descriptions, links
   or a fresh Item version. Use the fixed IDs in tool calls and display names
   when speaking to people.
2. Apply only the requested fields. Reuse `version` from your last read for each
   updated or deleted Item. If any Item is stale, the entire call is refused:
   call `get_items` for the current Items, preserve unrelated edits, and retry.
3. Report the accepted changes and any new Conflicts or flags. Each accepted
   change is a Revision; `list_revisions` supplies IDs for `restore_revision`.

List Items in date order and keep Dependency chains together when presenting a
plan. Stored row order changes only through an explicit reorder or Tidy request.

## Compact JSON

```json
{
  "chart": { "id": "ch_example", "title": "Release", "version": 2, "zoom": "weeks" },
  "holidays": ["2026-12-08"],
  "groups": [{ "id": "build", "name": "Build", "color": "indigo" }],
  "items": [
    { "id": "kickoff", "name": "Kickoff", "on": "2026-11-16", "version": 1 },
    { "id": "api", "name": "Build API", "start": "2026-11-17", "end": "2026-11-20", "after": ["kickoff"], "group": "build", "owners": ["Marco"], "version": 1 }
  ],
  "conflicts": [],
  "flags": []
}
```

Items are Tasks (`start` and `end`, inclusive) or Milestones (`on`). They store no
duration. Dates are ISO strings without times. Empty fields are omitted.
`get_chart` omits Item descriptions and links; `get_items` includes them.

For `create_chart`, pass `title`, optional Chart fields, and `items` without
versions; IDs are optional. Include Groups and Dependencies in that call. An
agent turns the person's brief into these fields. Alternatively `spec` accepts
this small line format, with the title first:

```text
Release
Kickoff | 2026-11-16
Build API | 2026-11-17 .. 2026-11-20
```

Use `apply_changes` for atomic bulk changes through MCP. Change types are `add`
(with `item` and optional `index`), `update` (with `id`, `version`, `fields`),
`delete` (with `id`, `version`), `order` (with `ids`), `holidays` (with `dates`),
`groups` (with `groups`), `chart` (with `fields`), and `tidy`.

## Rules

- Working Days are weekdays excluding Chart Holidays. Weekends are hidden.
  Holidays remain visible as grey columns. Adding a Holiday changes durations,
  never Item dates. Snap intended moves past Holidays.
- Refused: weekend endpoints, end before start, missing/self/looping Dependencies,
  or an unknown Group. Refusal saves nothing.
- Flagged and saved: Conflicts, Holiday endpoints, and empty names.
- Dependencies are finish → start, stored on the later Item as `after: [ids]`.
  After a Task ending Friday, the next Item may start Monday. After a Milestone,
  it may start on that Milestone's own date. A Conflict warns; dates stay put.
- Nothing moves dates automatically. Shorten a Task by counting Working Days,
  then explicitly update its end date. Keep its start unless asked to move it.
- Group palette: indigo, blue, teal, green, amber, orange, rose, violet.
  Owners are plain names. There is no progress, status, Phase or sign-in.

## In an open Chart

Use the `Chart` bridge actions, not simulated clicks. Prefer the browser's
registered WebMCP tools. Without WebMCP, call `window.ganttaro.snapshot()`,
`window.ganttaro.query(...)`, and `window.ganttaro.act({ steps: [...] })`.

```js
await window.ganttaro.act({ steps: [
  { ref: "Chart", action: "update_items", args: [[{ id: "api", fields: { end: "2026-11-19" } }]] }
] })
```

The bridge includes compact state through 60 Items. Above that, call `describe`.
It adds or updates one Item per action; MCP supports bulk changes. View Links
expose reads only. `remove` requires a person to confirm with a click; wait for
that confirmation. Restoring a Revision may also remove Items and needs a click.
Exports are available to people only in this milestone.

Resolve annotated elements through their `data-item-id` and `data-chart-id`
attributes. Re-read that Item before changing it through MCP. An annotation
identifies an Item; it does not authorise unrelated edits.
