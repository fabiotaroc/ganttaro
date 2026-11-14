import { useState } from "react"
import { webmcp } from "./agent"
import { Gantt } from "./gantt-react"
import { calendar, items } from "./sample"

type Entry = { key: string; source: string; reason: string }

export function App() {
  const [log, setLog] = useState<Entry[]>([])
  const record = (key: string) => (_value: unknown, details: { source?: string; reason: string }) =>
    setLog((entries) => [{ key, source: details.source ?? "?", reason: details.reason }, ...entries].slice(0, 12))

  return (
    <main>
      <h1>UI SDK Gantt spike</h1>
      <p className="hint">
        Drag bars to move, drag their ends to resize, drag a bar's right dot onto another bar's left dot to add a
        Dependency, drag row names to reorder, double-click a name to rename. WebMCP registerTool here:{" "}
        <code>{webmcp}</code>
      </p>
      <Gantt
        calendar={calendar}
        defaultItems={items}
        onItemsChange={record("items")}
        onOrderChange={record("order")}
      />
      <h2>Change log</h2>
      <ol className="log">
        {log.map((entry, index) => (
          <li key={index} data-source={entry.source}>
            {entry.key} · {entry.reason} · <strong>{entry.source}</strong>
          </li>
        ))}
      </ol>
    </main>
  )
}
