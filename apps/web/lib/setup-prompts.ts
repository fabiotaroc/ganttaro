// Keep in step with the "Setup prompt" section of the README.
export const setupPrompts = {
  claude: {
    harness: 'Claude Code',
    prompt: `Install the Ganttaro plugin from https://github.com/fabiotaroc/ganttaro.
Run:
  claude plugin marketplace add fabiotaroc/ganttaro
  claude plugin install ganttaro@ganttaro --scope user

Verify installation with \`claude plugin list\`.
Tell me if I need to start a new session to load its skill and MCP tools.`,
  },
  chatgpt: {
    harness: 'ChatGPT Work or Codex',
    prompt: `Install the Ganttaro plugin from https://github.com/fabiotaroc/ganttaro.
Run:
  codex plugin marketplace add fabiotaroc/ganttaro
  codex plugin add ganttaro@ganttaro

Verify installation with \`codex plugin list\`.
Tell me if I need to start a new session or restart the desktop app
to load its skill and MCP tools.`,
  },
} as const;

export type SetupHarness = keyof typeof setupPrompts;
