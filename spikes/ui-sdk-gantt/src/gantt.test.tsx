// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { createAgent } from "@ui-sdk/react/agent"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import type { GanttItem } from "./gantt"
import { Gantt } from "./gantt-react"
import { calendar, items, manyItems } from "./sample"

beforeAll(() => {
  Element.prototype.getAnimations = () => []
  Element.prototype.scrollIntoView = function () {}
  Element.prototype.checkVisibility = () => true
  document.elementFromPoint = () => null
  document.elementsFromPoint = () => []
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(cleanup)

let approveDelete = false
const agent = createAgent({ allow: (step) => step.action !== "remove" || approveDelete })

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

test("the whole chart is one component, with every Item as an item", async () => {
  render(<Gantt calendar={calendar} defaultItems={items} />)
  await tick()
  const snapshot = agent.snapshot().filter((entry) => !entry.offPage)
  console.log(JSON.stringify(snapshot, null, 2))
  const chart = snapshot.find((entry) => entry.component === "gantt")
  expect(chart?.label).toBe("Chart")
  expect(chart?.actions).toEqual(["setDates", "rename", "remove", "addDependency", "removeDependency"])
  const found = await agent.query({ within: "Chart" })
  console.log(JSON.stringify(found, null, 2).slice(0, 1200))
})

test("Agent Edits (Bridge) arrive tagged as agent, and the rules still apply", async () => {
  const onItemsChange = vi.fn()
  render(<Gantt calendar={calendar} defaultItems={items} onItemsChange={onItemsChange} />)
  await tick()

  const moved = await agent.act({ steps: [{ ref: "Chart", action: "setDates", args: ["api", 5, 12] }] })
  expect(moved.ok, moved.error?.message).toBe(true)
  expect(onItemsChange.mock.calls.at(-1)?.[1].source).toBe("agent")
  const api = (onItemsChange.mock.calls.at(-1)?.[0] as GanttItem[]).find((item) => item.id === "api")
  expect([api?.start, api?.end]).toEqual([5, 12])

  const renamed = await agent.act({ steps: [{ ref: "Chart", action: "rename", args: ["Build API", "Build API v2"] }] })
  expect(renamed.ok, renamed.error?.message).toBe(true)
  expect(screen.getAllByText("Build API v2").length).toBeGreaterThan(0)

  const linked = await agent.act({ steps: [{ ref: "Chart", action: "addDependency", args: ["golive", "kickoff"] }] })
  expect(linked.ok, linked.error?.message).toBe(true)

  const loop = await agent.act({ steps: [{ ref: "Chart", action: "addDependency", args: ["kickoff", "golive"] }] })
  expect(loop.ok).toBe(false)
  console.log("loop refused:", loop.error?.message)

  const refused = await agent.act({ steps: [{ ref: "Chart", action: "remove", args: ["qa"] }] })
  expect(refused.ok).toBe(false)
  approveDelete = true
  const removed = await agent.act({ steps: [{ ref: "Chart", action: "remove", args: ["qa"] }] })
  expect(removed.ok, removed.error?.message).toBe(true)
  expect(screen.queryByText("QA & UAT")).toBeNull()
})

test("a 150-Item chart still reads as one component", async () => {
  render(<Gantt calendar={calendar} defaultItems={manyItems(150)} />)
  await tick()
  const snapshot = agent.snapshot().filter((entry) => !entry.offPage)
  expect(snapshot.filter((entry) => entry.component === "gantt")).toHaveLength(1)
  console.log("snapshot characters for 150 Items:", JSON.stringify(snapshot).length)
  const page = await agent.query({ within: "Chart", text: "Task 140" })
  console.log(JSON.stringify(page).slice(0, 600))
})
