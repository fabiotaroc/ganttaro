import type { ISODate } from './types';
const day = 86_400_000;
export function dateNumber(date: ISODate): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date: ${date}`);
  const value = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) throw new Error(`Invalid date: ${date}`);
  return value / day;
}
export const fromNumber = (value: number): ISODate => new Date(value * day).toISOString().slice(0, 10);
export const addDays = (date: ISODate, amount: number): ISODate => fromNumber(dateNumber(date) + amount);
export function isWeekday(date: ISODate): boolean {
  const weekday = new Date(dateNumber(date) * day).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}
export const isWorkingDay = (date: ISODate, holidays: readonly ISODate[] = []): boolean => isWeekday(date) && !holidays.includes(date);
export function nextWorkingDay(date: ISODate, holidays: readonly ISODate[] = [], inclusive = false): ISODate {
  let result = inclusive ? date : addDays(date, 1);
  while (!isWorkingDay(result, holidays)) result = addDays(result, 1);
  return result;
}
export function previousWorkingDay(date: ISODate, holidays: readonly ISODate[] = [], inclusive = false): ISODate {
  let result = inclusive ? date : addDays(date, -1);
  while (!isWorkingDay(result, holidays)) result = addDays(result, -1);
  return result;
}
export function workingDaysBetween(start: ISODate, end: ISODate, holidays: readonly ISODate[] = []): number {
  const a = dateNumber(start), b = dateNumber(end);
  if (a > b) return 0;
  let count = 0;
  for (let n = a; n <= b; n++) if (isWorkingDay(fromNumber(n), holidays)) count++;
  return count;
}
export function workingDayIndex(date: ISODate, origin: ISODate, holidays: readonly ISODate[] = []): number {
  if (!isWorkingDay(date, holidays) || !isWorkingDay(origin, holidays)) throw new Error('Working Day indexes require Working Days');
  return date >= origin ? workingDaysBetween(origin, date, holidays) - 1 : -workingDaysBetween(date, origin, holidays) + 1;
}
export function workingDayAt(index: number, origin: ISODate, holidays: readonly ISODate[] = []): ISODate {
  if (!Number.isInteger(index) || !isWorkingDay(origin, holidays)) throw new Error('Invalid Working Day index or origin');
  let date = origin;
  for (let i = 0; i < Math.abs(index); i++) date = index < 0 ? previousWorkingDay(date, holidays) : nextWorkingDay(date, holidays);
  return date;
}
export function italianHolidays(year: number): ISODate[] {
  if (!Number.isInteger(year) || year < 1583 || year > 9998) throw new Error('Invalid Gregorian year');
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), date = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  // Weekend holidays are omitted because Holiday columns only represent weekdays.
  return [...new Set(['01-01','01-06','04-25','05-01','06-02','08-15','11-01','12-08','12-25','12-26']
    .map(value => `${year}-${value}`).concat(year >= 2026 ? [`${year}-10-04`] : []).concat(addDays(easter, 1)).filter(isWeekday))].sort();
}
