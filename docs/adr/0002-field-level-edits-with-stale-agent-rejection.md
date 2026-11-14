# Field-level edits; Agent Edits based on stale data are refused

People and agents edit the same hosted Chart at the same time, and agents work from data that can be tens of seconds old. Changes are applied to individual fields of individual Items, never by replacing the whole Chart. Manual Edits apply immediately and appear live for everyone. An Agent Edit carries the state it read and is refused if any targeted Item changed since; the agent then gets the latest state and retries. Agents show up as live participants, and every change becomes a Revision.

## Considered Options

- **Replacing the whole Chart, last write wins:** simplest, but an agent working from old data silently overwrites people's drags.
- **Item-level last write wins:** a rename and an agent's date change to the same Item would clobber each other.
- **MagicPath's approach** (live presence, edit queues, version history, no documented merge rule): we kept presence and history, and added the stale-agent check, because agent latency is our main clash risk.
