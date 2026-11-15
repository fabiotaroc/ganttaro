# Ganttaro

Before implementation, read [GLOSSARY.md](GLOSSARY.md), the decisions in
[docs/adr](docs/adr), and [the milestone plan](docs/plans/0001-first-milestone.md).
Follow the plan's build order, acceptance criteria and provisioning boundaries.

Before writing UI SDK code, read the installed ui-sdk skill and
`node_modules/@ui-sdk/react/docs/llms.txt`, then consult
[the spike findings](docs/spikes/0001-ui-sdk-gantt.md). Keep the spike outside the workspace build.

To read or change a Chart on the local dev server, use the `ganttaro-local` MCP tools
like any user would, not hand-written requests to `/mcp`.

Keep domain rules in packages/core, free of React, Convex and I/O.
Use the glossary's terms in code and user-facing copy.
