import { addDays, dateNumber, isWeekday, workingDaysBetween } from './calendar';
import { endOf, startOf, type Chart, type ISODate, type Zoom } from './types';
export const columnWidth: Record<Zoom, number> = { days: 40, weeks: 24, months: 12 };
export function layout(chart: Chart, options: { start: ISODate; end: ISODate; zoom?: Zoom }) {
  const columns: { date: ISODate; holiday: boolean; x: number }[] = [];
  const width = columnWidth[options.zoom ?? chart.zoom];
  // Holidays retain visible weekday columns; Working Day duration excludes them.
  for (let n = dateNumber(options.start); n <= dateNumber(options.end); n++) {
    const date = addDays(options.start, n - dateNumber(options.start));
    if (isWeekday(date))
      columns.push({ date, holiday: chart.holidays.includes(date), x: columns.length * width });
  }
  const origin = columns[0]?.date ?? options.start;
  const index = (date: ISODate) =>
    date >= origin ? workingDaysBetween(origin, date) - 1 : -workingDaysBetween(date, origin) + 1;
  return {
    columns,
    columnWidth: width,
    width: columns.length * width,
    bars: chart.items.map((item, row) => ({
      id: item.id,
      row,
      x: index(startOf(item)) * width,
      width: (index(endOf(item)) - index(startOf(item)) + 1) * width,
      milestone: item.on !== undefined,
      duration: workingDaysBetween(startOf(item), endOf(item), chart.holidays),
    })),
  };
}
