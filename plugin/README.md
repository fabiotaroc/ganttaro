# Install Ganttaro

Endpoint: `https://ganttaro.vercel.app/mcp` (Streamable HTTP).
The endpoint has no login. Each tool takes a Chart link; keep Edit Links private.
The GitHub repository is private, so repository installation requires GitHub access.

## Claude Code

In a terminal, add this private repository as a marketplace and install:

```sh
claude plugin marketplace add fabiotaroc/ganttaro
claude plugin install ganttaro@ganttaro
```

Restart the session, check `/mcp` for the Ganttaro server, then ask Claude to use
Ganttaro with a Chart link. The plugin includes the skill and HTTP connection.
For local development without installing into your account:

```sh
claude --plugin-dir ./plugin
```

Verified against the current [marketplace guide](https://code.claude.com/docs/en/plugin-marketplaces),
[plugin manifest reference](https://code.claude.com/docs/en/plugins-reference), and
[HTTP MCP configuration](https://code.claude.com/docs/en/mcp).
No marketplace-directory submission is needed.

## Codex

Add this fragment to `~/.codex/config.toml` (merge with existing configuration):

```toml
[mcp_servers.ganttaro]
url = "https://ganttaro.vercel.app/mcp"
```

Then install the skill from this repository and restart the session:

```sh
npx skills add fabiotaroc/ganttaro --skill ganttaro --agent codex
```

The same fragment is in `config/codex.toml`. This is an unauthenticated endpoint,
so there is no MCP OAuth login. See [Codex HTTP MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli#configure-with-configtoml).

## Cursor

Merge `config/cursor.json` into `.cursor/mcp.json` for a project, or
`~/.cursor/mcp.json` for all projects:

```json
{"mcpServers":{"ganttaro":{"url":"https://ganttaro.vercel.app/mcp"}}}
```

Install the skill with `npx skills add fabiotaroc/ganttaro --skill ganttaro --agent cursor`.
Open Cursor's Customize settings and verify the Ganttaro MCP server is enabled.
See [Cursor MCP configuration and locations](https://cursor.com/docs/mcp).

## Other harnesses

Run `npx skills add fabiotaroc/ganttaro --skill ganttaro`, select the harness, and
configure its remote MCP connection to the endpoint above. Skill installation
adds instructions; it does not create an MCP connection by itself.
See the [skills CLI](https://www.skills.sh/docs/cli).

## Local or preview endpoint

Replace the endpoint in the chosen config with `http://localhost:3101/mcp` for
local testing, or the deployed preview's `/mcp` endpoint. Vercel-protected
previews also require that harness to have deployment access; the app itself
still uses Chart links for access.

Documentation checked on 14 November 2026. Validate packaging with
`claude plugin validate ./plugin` and `claude plugin validate .`.
