import { applyChanges } from './changes';
import { conflicts } from './rules';
import type { Chart, ISODate, Item, ItemPatch } from './types';
// Unsaved edits to one Item in the details panel. Each field remembers the stored value
// from when it was first edited, so edits made by others in the meantime can be detected.
export type DraftValues = {
  name: string;
  dates: { start: ISODate; end: ISODate } | { on: ISODate };
  description: string;
  owners: string[];
  group: string | null;
  after: string[];
  links: string[];
};
export type DraftField = keyof DraftValues;
export type Draft = {
  version?: number;
  fields: { [F in DraftField]?: { base: DraftValues[F]; value: DraftValues[F] } };
};
export const emptyDraft: Draft = { fields: {} };
export function storedValues(item: Item): DraftValues {
  return {
    name: item.name,
    dates: item.on !== undefined ? { on: item.on } : { start: item.start, end: item.end },
    description: item.description ?? '',
    owners: item.owners ?? [],
    group: item.group ?? null,
    after: item.after ?? [],
    links: item.links ?? [],
  };
}
const same = (field: DraftField, a: unknown, b: unknown) =>
  JSON.stringify(field === 'after' ? [...(a as string[])].sort() : a) ===
  JSON.stringify(field === 'after' ? [...(b as string[])].sort() : b);
export function draftValue<F extends DraftField>(
  draft: Draft,
  item: Item,
  field: F,
): DraftValues[F] {
  return (draft.fields[field]?.value ?? storedValues(item)[field]) as DraftValues[F];
}
export function editDraft<F extends DraftField>(
  draft: Draft,
  item: Item,
  field: F,
  value: DraftValues[F],
): Draft {
  const base = draft.fields[field]?.base ?? storedValues(item)[field];
  return {
    version: draft.version ?? item.version,
    fields: { ...draft.fields, [field]: { base, value } },
  };
}
export function takeTheirs(draft: Draft, field: DraftField): Draft {
  const fields = { ...draft.fields };
  delete fields[field];
  return Object.keys(fields).length ? { ...draft, fields } : emptyDraft;
}
// The fields that differ from the stored Item, as one update.
export function draftPatch(draft: Draft, item: Item): ItemPatch {
  const stored = storedValues(item);
  const patch: ItemPatch = {};
  for (const [field, entry] of Object.entries(draft.fields) as [
    DraftField,
    { value: DraftValues[DraftField] },
  ][]) {
    if (same(field, entry.value, stored[field])) continue;
    if (field === 'dates') Object.assign(patch, entry.value);
    else Object.assign(patch, { [field]: entry.value });
  }
  return patch;
}
export type DraftNotice<F extends DraftField = DraftField> = { field: F; theirs: DraftValues[F] };
// Fields someone else changed after you started editing them, to a value other than yours.
export function draftNotices(draft: Draft, item: Item): DraftNotice[] {
  const stored = storedValues(item);
  return (Object.entries(draft.fields) as [DraftField, { base: unknown; value: unknown }][])
    .filter(
      ([field, entry]) =>
        !same(field, stored[field], entry.base) && !same(field, stored[field], entry.value),
    )
    .map(([field]) => ({ field, theirs: stored[field] }) as DraftNotice);
}
const messages: [RegExp, DraftField | null, string][] = [
  [/end is before start/, 'dates', 'End is before Start.'],
  [/weekend dates/, 'dates', 'Weekends are not Working Days. Pick a weekday.'],
  [/invalid date/, 'dates', 'Enter a valid date.'],
  [/Dependencies create a loop/, 'after', 'These Dependencies would create a loop.'],
  [/Dependency points to itself/, 'after', 'An Item cannot come after itself.'],
  [/missing Item|Unknown Item/, null, 'This Item, or one it comes after, no longer exists.'],
];
export type DraftProblems = { fields: Partial<Record<DraftField, string>>; other: string[] };
// Sorts refusal reasons into the fields they belong to, in user-facing wording.
export function draftProblems(reasons: readonly string[]): DraftProblems {
  const result: DraftProblems = { fields: {}, other: [] };
  for (const reason of reasons) {
    const match = messages.find(([pattern]) => pattern.test(reason));
    if (match?.[1]) result.fields[match[1]] ??= match[2];
    else if (!result.other.includes(match?.[2] ?? reason)) result.other.push(match?.[2] ?? reason);
  }
  return result;
}
export type DraftCheck = DraftProblems & { conflicts: string[] };
// Checks a draft with the Chart's own rules. Conflicts are warnings and never block saving.
export function checkDraft(chart: Chart, item: Item, patch: ItemPatch): DraftCheck {
  const result = applyChanges(chart, [{ type: 'update', id: item.id, fields: patch }]);
  if (!result.ok) return { ...draftProblems(result.reasons), conflicts: [] };
  const name = (id: string) =>
    result.chart.items.find(other => other.id === id)?.name || 'Unnamed Item';
  return {
    fields: {},
    other: [],
    conflicts: conflicts(result.chart).flatMap(conflict =>
      conflict.item === item.id
        ? [`Starts before ${name(conflict.after)} finishes.`]
        : conflict.after === item.id
          ? [`${name(conflict.item)} starts before this finishes.`]
          : [],
    ),
  };
}
export type RevisionSummary = {
  kind: string;
  client?: string;
  diffs: readonly { target: string; id: string; field: string }[];
};
const storedFields: Record<DraftField, string[]> = {
  name: ['name'],
  dates: ['start', 'end', 'on'],
  description: ['description'],
  owners: ['owners'],
  group: ['group'],
  after: ['after'],
  links: ['links'],
};
// Who last changed a field, from Revisions newest first. Revisions name agents but not people.
export function changedBy(
  revisions: readonly RevisionSummary[],
  itemId: string,
  field: DraftField,
): string {
  const revision = revisions.find(revision =>
    revision.diffs.some(
      diff =>
        diff.target === 'item' && diff.id === itemId && storedFields[field].includes(diff.field),
    ),
  );
  if (!revision || revision.kind === 'Manual') return 'someone else';
  return revision.client ? `an agent (${revision.client})` : 'an agent';
}
