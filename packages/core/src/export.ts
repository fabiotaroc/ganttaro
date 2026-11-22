import { workingDaysBetween } from './calendar';
import { conflicts } from './rules';
import {
  endOf,
  startOf,
  type Chart,
  type Color,
  type Holiday,
  type ISODate,
  type Item,
  type Zoom,
} from './types';

export type ExportGroup = {
  name: string;
  color: Color;
};

export type ExportTimeline = {
  start?: ISODate;
  end?: ISODate;
  zoom: Zoom;
  weekends: 'hidden';
  holidays?: Holiday[];
};

type ExportItemBase = {
  name: string;
  group?: string;
  owners?: string[];
  after?: string[];
  conflictsWith?: string[];
};

export type ExportTask = ExportItemBase & {
  type: 'task';
  start: ISODate;
  end: ISODate;
  workingDays: number;
};

export type ExportMilestone = ExportItemBase & {
  type: 'milestone';
  date: ISODate;
};

export type ExportItem = ExportTask | ExportMilestone;

export type ExportChart = {
  title: string;
  description?: string;
  timeline: ExportTimeline;
  groups?: ExportGroup[];
  items: ExportItem[];
};

const displayName = (item: Item): string => (item.name.trim() ? item.name : 'Unnamed Item');

export function exportData(chart: Chart): ExportChart {
  const start = chart.items.map(startOf).sort()[0];
  const end = chart.items.map(endOf).sort().at(-1);
  const holidays =
    start && end
      ? [...new Set(chart.holidays.filter(date => date >= start && date <= end))].sort()
      : [];

  const timeline: ExportTimeline = {
    ...(start && end ? { start, end } : {}),
    zoom: chart.zoom,
    weekends: 'hidden',
    ...(holidays.length ? { holidays } : {}),
  };

  const usedGroupIds = new Set(
    chart.items.map(item => item.group).filter((id): id is string => Boolean(id)),
  );
  const usedGroups = chart.groups.filter(group => usedGroupIds.has(group.id));
  const rawGroupCounts = new Map<string, number>();
  for (const group of usedGroups) {
    rawGroupCounts.set(group.name, (rawGroupCounts.get(group.name) ?? 0) + 1);
  }
  const colorGroupCandidates = usedGroups.map(group =>
    (rawGroupCounts.get(group.name) ?? 0) > 1 ? `${group.name} (${group.color})` : group.name,
  );
  const candidateCounts = new Map<string, number>();
  for (const candidate of colorGroupCandidates) {
    candidateCounts.set(candidate, (candidateCounts.get(candidate) ?? 0) + 1);
  }
  const seenCandidates = new Map<string, number>();
  const groupNames = new Map<string, string>();
  const groups: ExportGroup[] = usedGroups.map((group, index) => {
    const candidate = colorGroupCandidates[index];
    let resolved = candidate;
    if ((candidateCounts.get(candidate) ?? 0) > 1) {
      const occurrence = (seenCandidates.get(candidate) ?? 0) + 1;
      seenCandidates.set(candidate, occurrence);
      resolved = `${group.name} (${group.color} ${occurrence})`;
    }
    groupNames.set(group.id, resolved);
    return { name: resolved, color: group.color };
  });

  const itemNameCounts = new Map<string, number>();
  for (const item of chart.items) {
    const name = displayName(item);
    itemNameCounts.set(name, (itemNameCounts.get(name) ?? 0) + 1);
  }
  const itemRefs = new Map<string, string>();
  chart.items.forEach((item, index) => {
    const name = displayName(item);
    itemRefs.set(
      item.id,
      (itemNameCounts.get(name) ?? 0) > 1 ? `${name} (row ${index + 1})` : name,
    );
  });

  const conflictsByItem = new Map<string, string[]>();
  for (const conflict of conflicts(chart)) {
    const ref = itemRefs.get(conflict.after);
    if (!ref) continue;
    const list = conflictsByItem.get(conflict.item) ?? [];
    list.push(ref);
    conflictsByItem.set(conflict.item, list);
  }

  const items: ExportItem[] = chart.items.map(item => {
    const name = displayName(item);
    const group = item.group ? groupNames.get(item.group) : undefined;
    const owners = item.owners?.length ? [...item.owners] : undefined;
    const after = (item.after ?? [])
      .map(id => itemRefs.get(id))
      .filter((ref): ref is string => Boolean(ref));
    const conflictsWith = conflictsByItem.get(item.id);
    const shared: ExportItemBase = {
      name,
      ...(group ? { group } : {}),
      ...(owners ? { owners } : {}),
      ...(after.length ? { after } : {}),
      ...(conflictsWith?.length ? { conflictsWith } : {}),
    };
    if (item.on !== undefined) {
      return { type: 'milestone', name: shared.name, date: item.on, ...omitName(shared) };
    }
    return {
      type: 'task',
      name: shared.name,
      start: item.start,
      end: item.end,
      workingDays: workingDaysBetween(item.start, item.end, chart.holidays),
      ...omitName(shared),
    };
  });

  return {
    title: chart.title || 'Untitled Chart',
    ...(chart.description?.trim() ? { description: chart.description } : {}),
    timeline,
    ...(groups.length ? { groups } : {}),
    items,
  };
}

function omitName({ name: _name, ...rest }: ExportItemBase): Omit<ExportItemBase, 'name'> {
  return rest;
}

export function exportJson(chart: Chart): string {
  return JSON.stringify(exportData(chart), null, 2);
}
