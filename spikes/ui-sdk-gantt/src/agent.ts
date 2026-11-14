import { createAgent, registerTools } from "@ui-sdk/react/agent"

const agent = createAgent({
  allow: (step) =>
    step.action !== "remove" || window.confirm(`Let the agent delete "${step.args[0]}"?`),
})

const webmcp = typeof (document as { modelContext?: { registerTool?: unknown } }).modelContext?.registerTool
const unregister = registerTools(agent, { allow: () => true })

Object.assign(window, { agent, webmcp })

if (import.meta.hot) import.meta.hot.dispose(unregister)

export { agent, webmcp }
