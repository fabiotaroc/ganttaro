# The hosted Chart is the source of truth

Each Chart lives in one hosted copy, opened by everyone through a shared link, and agents change it through an MCP server, the way MagicPath works. We chose this over a source file in each repo with local live sync because clients and colleagues have to edit without installing anything. Syncing a repo file with a hosted copy in both directions would bring back the export-and-replace problem from the Leadabeelity chart. Repo files can only be one-way exports.

## Considered Options

- **Self-contained HTML file that embeds its source:** rejected, because saving means downloading a new copy and replacing the old one by hand.
- **Repo file plus a local live-sync server:** smooth for agents and git, but people without the tool can't edit.
