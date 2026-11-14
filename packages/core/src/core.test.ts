import { describe, expect, it } from 'vitest';
import { addDays, applyChanges, compact, conflicts, dateNumber, diffCharts, flags, fromCompact, generateId, hasCycle, isWeekday, italianHolidays, layout, nextWorkingDay, previousWorkingDay, staleItems, tidy, validate, workingDayAt, workingDayIndex, workingDaysBetween, type Chart, type Item } from './index';
const task = (id: string, start = '2026-11-16', end = '2026-11-20', after?: string[]): Item => ({ id, name: id, start, end, version: 1, ...(after ? { after } : {}) });
const chart = (items: Item[] = []): Chart => ({ id: 'chart', title: 'Launch', version: 1, zoom: 'weeks', holidays: [], groups: [], items });
describe('Working Days', () => {
  it('counts inclusively and skips weekends and Holidays', () => {
    expect(workingDaysBetween('2026-11-20', '2026-11-23')).toBe(2);
    expect(workingDaysBetween('2026-11-20', '2026-11-23', ['2026-11-23'])).toBe(1);
    expect(workingDaysBetween('2026-11-23', '2026-11-20')).toBe(0);
    expect(nextWorkingDay('2026-11-20', ['2026-11-23'])).toBe('2026-11-24');
    expect(previousWorkingDay('2026-11-23')).toBe('2026-11-20');
    expect(nextWorkingDay('2026-11-20', [], true)).toBe('2026-11-20');
  });
  it('round-trips positive and negative indexes across leap years and Holidays', () => {
    const holidays = ['2028-02-29'];
    for (let index = -30; index < 30; index++) {
      const date = workingDayAt(index, '2028-03-01', holidays);
      expect(workingDayIndex(date, '2028-03-01', holidays)).toBe(index);
    }
    expect(() => workingDayIndex('2026-11-21', '2026-11-16')).toThrow();
    expect(() => workingDayAt(0.5, '2026-11-16')).toThrow();
  });
  it('rejects invalid dates instead of normalising them', () => {
    for (const date of ['2026-02-29', '2026-13-01', 'yesterday', '2026-1-01']) expect(() => dateNumber(date)).toThrow();
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('includes Easter Monday 2027 and the current Italian weekday Holidays', () => {
    expect(italianHolidays(2027)).toEqual(['2027-01-01','2027-01-06','2027-03-29','2027-06-02','2027-10-04','2027-11-01','2027-12-08']);
    expect(italianHolidays(2026)).toContain('2026-04-06');
    expect(italianHolidays(2026).every(isWeekday)).toBe(true);
    expect(italianHolidays(2011).filter(date => date === '2011-04-25')).toHaveLength(1);
    expect(() => italianHolidays(1)).toThrow();
  });
});
describe('validation and Conflicts', () => {
  it('allows Monday after Friday but flags starting Friday', () => {
    const c = chart([task('a'), task('b', '2026-11-23', '2026-11-24', ['a'])]);
    expect(conflicts(c)).toEqual([]);
    c.items[1] = task('b', '2026-11-20', '2026-11-24', ['a']);
    expect(conflicts(c)).toEqual([{ item: 'b', after: 'a' }]);
    expect(validate(c).ok).toBe(true);
  });
  it('allows an Item on its predecessor Milestone date', () => {
    expect(conflicts(chart([{ id: 'kickoff', name: 'Kickoff', on: '2026-11-16', version: 1 }, task('b', '2026-11-16', '2026-11-20', ['kickoff'])]))).toEqual([]);
  });
  it('uses the last Working Day of a Task ending on a Holiday', () => {
    const c = chart([task('a'), task('b', '2026-11-20', '2026-11-23', ['a'])]); c.holidays = ['2026-11-20'];
    expect(conflicts(c)).toEqual([]);
    expect(flags(c)).toHaveLength(2);
  });
  it.each([
    task('bad', '2026-11-21'), task('bad', '2026-11-23', '2026-11-20'),
    task('bad', '2026-11-16', '2026-11-20', ['missing']),
    task('bad', '2026-11-16', '2026-11-20', ['bad']),
    { ...task('bad'), group: 'missing' }, { ...task('bad'), on: '2026-11-16' },
  ])('refuses invalid Item %#', item => expect(validate(chart([item as Item])).ok).toBe(false));
  it('refuses indirect loops', () => {
    const items = [task('a', undefined, undefined, ['c']), task('b', undefined, undefined, ['a']), task('c', undefined, undefined, ['b'])];
    expect(hasCycle(items)).toBe(true); expect(validate(chart(items)).ok).toBe(false);
  });
  it('saves an empty name as a flag', () => {
    const c = chart([{ ...task('a'), name: '' }]);
    expect(validate(c)).toEqual({ ok: true, flags: [{ item: 'a', kind: 'empty-name' }] });
  });
});
describe('changes', () => {
  it('adding a Holiday changes duration without moving dates or changing Item versions', () => {
    const c = chart([task('a')]); const result = applyChanges(c, [{ type: 'holidays', dates: ['2026-11-18'] }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chart.items).toEqual(c.items);
    expect(workingDaysBetween('2026-11-16', '2026-11-20', result.chart.holidays)).toBe(4);
    expect(c.holidays).toEqual([]);
  });
  it('applies fields independently, keeps IDs, and reports only new Conflicts', () => {
    let c = chart([task('a'), task('b', '2026-11-23', '2026-11-24', ['a'])]);
    const first = applyChanges(c, [{ type: 'update', id: 'b', fields: { name: 'Renamed' } }]);
    if (!first.ok) throw Error(); c = first.chart;
    const second = applyChanges(c, [{ type: 'update', id: 'b', fields: { start: '2026-11-19' } }]);
    if (!second.ok) throw Error();
    expect(second.chart.items[1]).toMatchObject({ name: 'Renamed', id: 'b', start: '2026-11-19', version: 3 });
    expect(second.conflicts).toEqual([{ item: 'b', after: 'a' }]);
    expect(applyChanges(second.chart, [{ type: 'chart', fields: { title: 'New' } }])).toMatchObject({ ok: true, conflicts: [] });
  });
  it('refuses a whole batch atomically', () => {
    const c = chart([task('a')]);
    expect(applyChanges(c, [{ type: 'update', id: 'a', fields: { name: 'Changed' } }, { type: 'add', item: { name: 'Bad', start: '2026-11-21', end: '2026-11-23' } }]).ok).toBe(false);
    expect(c.items[0].name).toBe('a');
  });
  it('removes incoming Dependencies on deletion and versions affected Items', () => {
    const result = applyChanges(chart([task('a'), task('b', undefined, undefined, ['a'])]), [{ type: 'delete', id: 'a' }]);
    expect(result).toMatchObject({ ok: true, chart: { items: [{ id: 'b', after: [], version: 2 }] } });
  });
  it('checks every targeted version including missing versions', () => {
    const c = chart([task('a'), task('b')]);
    expect(staleItems(c, [{ type: 'update', id: 'a', version: 1, fields: { name: 'A' } }, { type: 'delete', id: 'b', version: 0 }]).map(item => item.id)).toEqual(['b']);
    expect(staleItems(c, [{ type: 'delete', id: 'a' }])).toHaveLength(1);
  });
  it('refuses invalid row order and unknown fields', () => {
    const c = chart([task('a'), task('b')]);
    expect(applyChanges(c, [{ type: 'order', ids: ['a', 'a'] }]).ok).toBe(false);
    expect(applyChanges(c, [{ type: 'update', id: 'a', fields: { id: 'other' } } as never]).ok).toBe(false);
  });
});
describe('Tidy, IDs, compact JSON and layout', () => {
  it('keeps chains together and preserves stored order for equal dates', () => {
    const items = [task('a'), task('unrelated', '2026-11-17'), task('later', '2026-11-23', '2026-11-24', ['a']), task('same-date')];
    expect(tidy(items).map(item => item.id)).toEqual(['a','later','same-date','unrelated']);
    expect(tidy(tidy(items))).toEqual(tidy(items));
    expect(items[1].id).toBe('unrelated');
  });
  it('generates stable unique slugs including empty and accented names', () => {
    expect(generateId('Caffè API', ['caffe-api','caffe-api-2'])).toBe('caffe-api-3');
    expect(generateId('', [])).toBe('item');
  });
  it('omits empty fields and hides descriptions and links on compact reads', () => {
    const c = chart([{ ...task('a'), description: 'Details', links: ['https://example.com'], owners: [], after: [] }]);
    expect(compact(c).items[0]).not.toHaveProperty('description');
    expect(compact(c).items[0]).not.toHaveProperty('owners');
    expect(compact(c, true).items[0]).toHaveProperty('description', 'Details');
    expect(fromCompact(compact(c, true))).toMatchObject({ items: [{ name: 'a', description: 'Details' }] });
  });
  it('renders Holidays but never weekends, and shares positions across zooms', () => {
    const c = chart([task('a', '2026-11-20', '2026-11-23')]); c.holidays = ['2026-11-23'];
    for (const zoom of ['days','weeks','months'] as const) {
      const result = layout(c, { start: '2026-11-19', end: '2026-11-24', zoom });
      expect(result.columns.map(column => column.date)).toEqual(['2026-11-19','2026-11-20','2026-11-23','2026-11-24']);
      expect(result.bars[0]).toMatchObject({ x: result.columnWidth, width: result.columnWidth * 2, duration: 1, row: 0 });
      expect(result.columns[2].holiday).toBe(true);
    }
  });
  it('records before and after values per field, including row order', () => {
    const c = chart([task('a')]); const result = applyChanges(c, [{ type: 'update', id: 'a', fields: { name: 'Renamed' } }]);
    if (!result.ok) throw Error();
    expect(diffCharts(c, result.chart)).toContainEqual({ target: 'item', id: 'a', field: 'name', before: 'a', after: 'Renamed' });
  });
});
