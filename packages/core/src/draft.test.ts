import { describe, expect, it } from 'vitest';
import {
  changedBy,
  checkDraft,
  draftNotices,
  draftPatch,
  draftProblems,
  draftValue,
  editDraft,
  emptyDraft,
  takeTheirs,
  type Chart,
  type Item,
} from './index';
const task = (id: string, start = '2026-11-16', end = '2026-11-20', after?: string[]): Item => ({
  id,
  name: id,
  start,
  end,
  version: 1,
  ...(after ? { after } : {}),
});
const chart = (items: Item[]): Chart => ({
  id: 'chart',
  title: 'Launch',
  version: 1,
  zoom: 'weeks',
  holidays: [],
  groups: [{ id: 'design', name: 'Design', color: 'violet' }],
  items,
});
describe('Drafts', () => {
  it('collects every edited field into one patch, skipping values equal to the stored Item', () => {
    const item = task('wireframes');
    let draft = editDraft(emptyDraft, item, 'name', 'Wireframes v2');
    draft = editDraft(draft, item, 'group', 'design');
    draft = editDraft(draft, item, 'dates', { start: '2026-11-17', end: '2026-11-20' });
    draft = editDraft(draft, item, 'owners', []);
    expect(draftPatch(draft, item)).toEqual({
      name: 'Wireframes v2',
      group: 'design',
      start: '2026-11-17',
      end: '2026-11-20',
    });
    expect(draft.version).toBe(1);
    expect(draftValue(draft, item, 'name')).toBe('Wireframes v2');
    expect(draftValue(draft, item, 'description')).toBe('');
  });
  it('treats Dependencies as a set and clearing a Group as null', () => {
    const item = { ...task('b', '2026-11-23', '2026-11-27', ['a', 'c']), group: 'design' };
    let draft = editDraft(emptyDraft, item, 'after', ['c', 'a']);
    draft = editDraft(draft, item, 'group', null);
    expect(draftPatch(draft, item)).toEqual({ group: null });
  });
  it('flags a field only when someone else moved it away from both its start and your draft', () => {
    const item = task('wireframes');
    const draft = editDraft(emptyDraft, item, 'name', 'Mine');
    expect(draftNotices(draft, { ...item, name: 'Theirs' })).toEqual([
      { field: 'name', theirs: 'Theirs' },
    ]);
    expect(draftNotices(draft, { ...item, name: 'Mine' })).toEqual([]);
    expect(draftNotices(draft, { ...item, description: 'Unrelated' })).toEqual([]);
    const later = editDraft(draft, { ...item, name: 'Theirs' }, 'name', 'Mine again');
    expect(later.fields.name?.base).toBe('wireframes');
    expect(takeTheirs(draft, 'name')).toBe(emptyDraft);
  });
  it('checks drafts with the Chart rules, warning about Conflicts without blocking', () => {
    const a = task('a'),
      b = task('b', '2026-11-23', '2026-11-27', ['a']);
    const value = chart([a, b]);
    expect(checkDraft(value, b, { start: '2026-11-27', end: '2026-11-23' }).fields).toEqual({
      dates: 'End is before Start.',
    });
    expect(checkDraft(value, a, { after: ['b'] }).fields).toEqual({
      after: 'These Dependencies would create a loop.',
    });
    expect(checkDraft(value, b, { start: '2026-11-21', end: '2026-11-27' }).fields.dates).toMatch(
      /Weekends/,
    );
    expect(checkDraft(value, b, { start: '2026-11-19', end: '2026-11-27' })).toEqual({
      fields: {},
      other: [],
      conflicts: ['Starts before a finishes.'],
    });
    expect(checkDraft(value, a, { end: '2026-11-24' }).conflicts).toEqual([
      'b starts before this finishes.',
    ]);
  });
  it('sorts server reasons into fields', () => {
    expect(draftProblems(['b: end is before start', 'Something else'])).toEqual({
      fields: { dates: 'End is before Start.' },
      other: ['Something else'],
    });
  });
  it('names agents, but not people, as the author of the last change to a field', () => {
    const revisions = [
      { kind: 'Manual', diffs: [{ target: 'item', id: 'b', field: 'name' }] },
      {
        kind: 'Agent (MCP)',
        client: 'Claude Code',
        diffs: [{ target: 'item', id: 'a', field: 'end' }],
      },
      { kind: 'Manual', diffs: [{ target: 'item', id: 'a', field: 'name' }] },
    ];
    expect(changedBy(revisions, 'a', 'dates')).toBe('an agent (Claude Code)');
    expect(changedBy(revisions, 'a', 'name')).toBe('someone else');
    expect(changedBy([], 'a', 'name')).toBe('someone else');
  });
});
