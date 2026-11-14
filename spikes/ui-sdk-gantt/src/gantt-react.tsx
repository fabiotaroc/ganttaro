import { createParts } from "@ui-sdk/react/primitive"
import { workingDates, type Calendar } from "./calendar"
import { conflicts, gantt, type GanttItem, type GanttOptions } from "./gantt"

const parts = createParts(gantt, {
  root: "div",
  grid: "div",
  label: "div",
  input: "input",
  track: "div",
  bar: "div",
  port: "span",
})

export const COL = 28
export const ROW = 36

function Arrows({ items, order }: { items: GanttItem[]; order: string[] }) {
  const row = new Map(order.map((id, index) => [id, index]))
  const byId = new Map(items.map((item) => [item.id, item]))
  const bad = conflicts(items)
  return (
    <svg className="arrows" aria-hidden="true">
      {items.flatMap((item) =>
        item.after.map((dep) => {
          const upstream = byId.get(dep)
          if (!upstream) return null
          const x1 = upstream.end * COL
          const y1 = (row.get(dep) ?? 0) * ROW + ROW / 2
          const x2 = item.start * COL
          const y2 = (row.get(item.id) ?? 0) * ROW + ROW / 2
          const mid = Math.max(x1 + 8, x2 - 8)
          return (
            <path
              key={`${dep}->${item.id}`}
              d={`M${x1},${y1} H${mid} V${y2} H${x2}`}
              className={bad.has(item.id) ? "conflict" : undefined}
            />
          )
        }),
      )}
    </svg>
  )
}

export function Gantt({ calendar, ...options }: GanttOptions & { calendar: Calendar }) {
  const dates = workingDates(calendar)
  return (
    <parts.Root {...options} days={calendar.days} aria-label="Chart" className="gantt">
      {(state) => {
        const items = state.items
        const order = state.order
        const byId = new Map(items.map((item: GanttItem) => [item.id, item]))
        return (
          <div className="layout">
            <div className="labels">
              <div className="header" />
              {order.map((id: string) =>
                state.editing === id ? (
                  <parts.Input key={id} aria-label={`Rename ${byId.get(id)?.name}`} className="label" />
                ) : (
                  <parts.Label key={id} value={id} className="label">
                    {byId.get(id)?.name}
                  </parts.Label>
                ),
              )}
            </div>
            <div className="scroller">
              <div className="header" style={{ width: dates.length * COL }}>
                {dates.map((date, index) => (
                  <div
                    key={date}
                    className="day"
                    data-holiday={calendar.holidays.has(date) ? "" : undefined}
                    data-monday={new Date(date).getUTCDay() === 1 ? "" : undefined}
                    style={{ left: index * COL, width: COL }}
                  >
                    {date.slice(8)}
                  </div>
                ))}
              </div>
              <parts.Grid className="grid" style={{ width: dates.length * COL, height: order.length * ROW }}>
                {dates.map((date, index) =>
                  calendar.holidays.has(date) ? (
                    <div key={date} className="holiday" style={{ left: index * COL, width: COL }} />
                  ) : null,
                )}
                {order.map((id: string, index: number) => {
                  const item = byId.get(id)
                  if (!item) return null
                  return (
                    <parts.Track key={id} value={id} className="track" style={{ top: index * ROW, height: ROW }}>
                      <parts.Bar
                        value={id}
                        aria-label={item.name}
                        className="bar"
                        style={{ left: item.start * COL, width: (item.end - item.start) * COL }}
                      >
                        <span data-span-edge="start" className="edge start" />
                        <parts.Port value={`${id}:in`} className="port in" />
                        <span className="name">{item.name}</span>
                        <parts.Port value={`${id}:out`} className="port out" />
                        <span data-span-edge="end" className="edge end" />
                      </parts.Bar>
                    </parts.Track>
                  )
                })}
                <Arrows items={items} order={order} />
                {state.connecting && !state.connecting.to ? (
                  <svg className="arrows" aria-hidden="true">
                    <line className="pending" x1={(byId.get(state.connecting.from.split(":")[0])?.end ?? 0) * COL} y1={order.indexOf(state.connecting.from.split(":")[0]) * ROW + ROW / 2} x2={state.connecting.x} y2={state.connecting.y} />
                  </svg>
                ) : null}
              </parts.Grid>
            </div>
          </div>
        )
      }}
    </parts.Root>
  )
}
