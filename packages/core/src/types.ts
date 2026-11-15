export const palette = [
  'indigo',
  'blue',
  'teal',
  'green',
  'amber',
  'orange',
  'rose',
  'violet',
] as const;
export type Color = (typeof palette)[number];
export type ISODate = string;
export type Zoom = 'days' | 'weeks' | 'months';
export type Holiday = ISODate;
export type Group = { id: string; name: string; color: Color };
type ItemFields = {
  id: string;
  name: string;
  version: number;
  after?: string[];
  group?: string;
  owners?: string[];
  description?: string;
  links?: string[];
};
export type Task = ItemFields & { start: ISODate; end: ISODate; on?: never };
export type Milestone = ItemFields & { on: ISODate; start?: never; end?: never };
export type Item = Task | Milestone;
export type Chart = {
  id: string;
  title: string;
  description?: string;
  version: number;
  zoom: Zoom;
  holidays: Holiday[];
  groups: Group[];
  items: Item[];
};
export type Conflict = { item: string; after: string };
export type Flag = { item: string; kind: 'empty-name' | 'holiday'; date?: ISODate };
export type Validation = { ok: true; flags: Flag[] } | { ok: false; reasons: string[] };
export type ItemInput = Omit<Task, 'id' | 'version'> | Omit<Milestone, 'id' | 'version'>;
export type ItemPatch = Partial<
  Pick<ItemFields, 'name' | 'after' | 'owners' | 'description' | 'links'>
> & { start?: ISODate; end?: ISODate; on?: ISODate; group?: string | null };
export type Change =
  | { type: 'add'; item: ItemInput & { id?: string }; index?: number }
  | { type: 'update'; id: string; version?: number; fields: ItemPatch }
  | { type: 'delete'; id: string; version?: number }
  | { type: 'order'; ids: string[] }
  | { type: 'holidays'; dates: Holiday[] }
  | { type: 'groups'; groups: Group[] }
  | { type: 'chart'; fields: Partial<Pick<Chart, 'title' | 'description' | 'zoom'>> }
  | { type: 'tidy' };
export type CompactChart = {
  chart: Omit<Chart, 'items' | 'groups' | 'holidays'>;
  items: Item[];
  groups: Group[];
  holidays: Holiday[];
  conflicts: Conflict[];
  flags: Flag[];
};
export const startOf = (item: Item): ISODate => item.on ?? item.start!;
export const endOf = (item: Item): ISODate => item.on ?? item.end!;
