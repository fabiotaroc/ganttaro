const DAY = 86_400_000

export type Calendar = {
  origin: string
  days: number
  holidays: Set<string>
}

function parse(iso: string) {
  return Date.parse(`${iso}T00:00:00Z`)
}

function format(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function isWeekend(ms: number) {
  const day = new Date(ms).getUTCDay()
  return day === 0 || day === 6
}

export function workingDates(calendar: Calendar): string[] {
  const dates: string[] = []
  let ms = parse(calendar.origin)
  while (dates.length < calendar.days) {
    if (!isWeekend(ms)) dates.push(format(ms))
    ms += DAY
  }
  return dates
}

export function indexOf(calendar: Calendar, iso: string): number {
  const index = workingDates(calendar).indexOf(iso)
  if (index === -1) throw new Error(`${iso} is not a weekday inside the chart`)
  return index
}

export function isHoliday(calendar: Calendar, index: number) {
  return calendar.holidays.has(workingDates(calendar)[index])
}
