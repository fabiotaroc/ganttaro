import { indexOf, type Calendar } from "./calendar"
import type { GanttItem } from "./gantt"

export const calendar: Calendar = {
  origin: "2026-11-16",
  days: 45,
  holidays: new Set(["2026-12-08", "2026-12-25", "2026-12-31", "2027-01-01"]),
}

function task(id: string, name: string, start: string, end: string, after: string[] = []): GanttItem {
  return { id, track: id, name, start: indexOf(calendar, start), end: indexOf(calendar, end) + 1, after }
}

export const items: GanttItem[] = [
  task("kickoff", "Kickoff", "2026-11-16", "2026-11-16"),
  task("discovery", "Discovery interviews", "2026-11-17", "2026-11-27", ["kickoff"]),
  task("prd", "PRD validated", "2026-11-30", "2026-12-02", ["discovery"]),
  task("design", "UX design", "2026-12-01", "2026-12-11", ["prd"]),
  task("api", "Build API", "2026-12-03", "2026-12-18", ["prd"]),
  task("frontend", "Build frontend", "2026-12-14", "2026-12-30", ["design"]),
  task("qa", "QA & UAT", "2027-01-04", "2027-01-08", ["api", "frontend"]),
  task("golive", "Go-live", "2027-01-11", "2027-01-11", ["qa"]),
]

export function manyItems(count: number): GanttItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${index}`,
    track: `t${index}`,
    name: `Task ${index + 1}`,
    start: index % 30,
    end: (index % 30) + 3,
    after: index ? [`t${index - 1}`] : [],
  }))
}
