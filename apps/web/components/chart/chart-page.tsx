'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import usePresence from '@convex-dev/presence/react';
import { Gantt, type EditDetails } from '@ganttaro/chart';
import { addDays, applyChanges, compact, endOf, fromCompact, generateId, nextWorkingDay, palette, startOf, type Change, type Chart, type CompactChart, type Group, type Zoom } from '@ganttaro/core';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Details, type EventEdit } from './details';
export function ChartPage({ chartKey, readOnly }: { chartKey: string; readOnly: boolean }) {
  const data = useQuery(api.charts.get, { key: chartKey, full: true });
  if (!data) return <main className="p-12 text-muted-foreground">Opening Chart…</main>;
  return <LoadedChart initial={data} chartKey={chartKey} readOnly={readOnly} />;
}
function LoadedChart({ initial, chartKey, readOnly }: { initial: CompactChart; chartKey: string; readOnly: boolean }) {
  const chart = fromCompact(initial);
  const [zoom, setZoom] = useState<Zoom>(chart.zoom);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'create'|'settings'|'history'|null>(null);
  const [message, setMessage] = useState('');
  const [undo, setUndo] = useState<Id<'revisions'>[]>([]), [redo, setRedo] = useState<Id<'revisions'>[]>([]);
  const [person] = useState(() => `Person ${crypto.randomUUID().slice(0,4)}`);
  const presence = usePresence(api.presence, chartKey, person);
  const history = useQuery(api.charts.history, { key: chartKey });
  const mutation = useMutation(api.charts.write).withOptimisticUpdate((store, args) => {
    if (!args.changes) return;
    const old = store.getQuery(api.charts.get, { key: chartKey, full: true });
    if (!old) return;
    const next = applyChanges(fromCompact(old), args.changes as Change[]);
    if (next.ok) store.setQuery(api.charts.get, { key: chartKey, full: true }, compact(next.chart, true));
  });
  const report = (text: string) => setMessage(chart.items.reduce((value, item) => value.replaceAll(`${item.id}:`, `${item.name || 'Unnamed Item'}:`), text));
  async function write(changes: Change[], details: EditDetails) {
    if (readOnly) throw new Error('A View Link cannot edit');
    const validation = applyChanges(chart, changes);
    if (!validation.ok) throw new Error(validation.reasons.join('; '));
    const manual = ['pointer','keyboard','mouse','touch','pen'].includes(details.source);
    const result = await mutation({ key: chartKey, kind: manual ? 'Manual' : 'Agent (Bridge)', ...(manual ? {} : { client: 'Browser agent' }), changes });
    if (!result.ok) throw new Error(result.reasons.join('; '));
    setUndo(value => [...value, result.revisionId]); setRedo([]); setMessage('');
    return result;
  }
  const edit: EventEdit = async (changes, event) => {
    try { await write(changes, { source: event.nativeEvent.isTrusted ? 'pointer' : 'programmatic', reason: 'form' }); return true; }
    catch (error) { report(error instanceof Error ? error.message : String(error)); return false; }
  };
  async function restore(id: string, inverse = false, bridge = false) {
    if (readOnly) throw new Error('A View Link cannot edit');
    const result = await mutation({ key: chartKey, kind: bridge ? 'Agent (Bridge)' : 'Manual', ...(bridge ? { client: 'Browser agent' } : {}), restore: id as Id<'revisions'>, inverse });
    if (!result.ok) throw new Error(result.reasons.join('; '));
    setMessage(''); return result;
  }
  useEffect(() => { const id = location.hash.replace('#item-', ''); if (id) document.getElementById(`item-${id}`)?.scrollIntoView({ block: 'center', inline: 'center' }); }, []);
  const first = chart.items.map(startOf).sort()[0] ?? new Date().toISOString().slice(0,10);
  const last = chart.items.map(endOf).sort().at(-1) ?? addDays(first, 30);
  const start = addDays(first, -7), end = addDays(last, 21);
  const item = chart.items.find(item => item.id === selected);
  return <main className="chart-page">
    <header className="chart-topbar"><Link className="wordmark" href="/">ganttaro<span>↗</span></Link><span className="chart-access">{readOnly ? 'View Link' : 'Edit Link'}</span><div className="presence">{presence?.filter(person => person.online).map(person => <span key={person.userId} title={person.userId}>{person.userId}</span>)}</div></header>
    <section className="chart-intro"><div><p className="eyebrow">Shared Chart</p><h1>{chart.title || 'Untitled Chart'}</h1>{chart.description && <p className="chart-description">{chart.description}</p>}</div><div className="chart-actions">{!readOnly && <><Button variant="outline" onClick={() => setDialog('settings')}>Chart settings</Button><Button onClick={() => setDialog('create')}>＋ New Item</Button></>}</div></section>
    <section className="chart-toolbar"><div className="zoom-control" aria-label="Zoom">{(['days','weeks','months'] as const).map(value => <Button key={value} variant={zoom === value ? 'secondary' : 'ghost'} size="sm" onClick={() => setZoom(value)}>{value[0].toUpperCase()+value.slice(1)}</Button>)}</div><div className="chart-actions">{!readOnly && <><Button variant="ghost" size="sm" onClick={event => void edit([{ type: 'chart', fields: { zoom } }], event)}>Set as default zoom</Button><Button variant="outline" size="sm" onClick={event => void edit([{ type: 'tidy' }], event)}>Tidy</Button><Button variant="ghost" size="sm" disabled={!undo.length} onClick={() => { const id = undo.at(-1)!; void restore(id, true).then(() => { setUndo(value => value.slice(0,-1)); setRedo(value => [...value,id]); }).catch(error => report(error.message)); }}>Undo</Button><Button variant="ghost" size="sm" disabled={!redo.length} onClick={() => { const id = redo.at(-1)!; void restore(id).then(() => { setRedo(value => value.slice(0,-1)); setUndo(value => [...value,id]); }).catch(error => report(error.message)); }}>Redo</Button></>}<Button variant="ghost" size="sm" onClick={() => setDialog('history')}>Revisions</Button></div></section>
    {message && <div className="chart-message" role="alert">{message}<Button variant="ghost" size="sm" onClick={() => setMessage('')}>Dismiss</Button></div>}
    <Gantt chart={{ ...chart, zoom }} start={start} end={end} readOnly={readOnly} onEdit={write} onOpen={setSelected} onError={report} onRestore={id => restore(id,false,true)} onHoliday={(date,event) => { void edit([{ type:'holidays',dates: chart.holidays.includes(date) ? chart.holidays.filter(value => value !== date) : [...chart.holidays,date] }],event); }} onDisconnect={(id,after,event) => { const item = chart.items.find(value => value.id === id)!; void edit([{ type:'update',id,version:item.version,fields:{after:item.after?.filter(value => value !== after)} }],event); }} />
    <footer className="chart-footer"><span>{chart.items.length} Items · {chart.groups.length} Groups · {initial.conflicts.length} Conflicts</span><span>Weekends hidden · Dates never move automatically</span></footer>
    <p className="chart-keyboard">Arrow keys navigate. Enter opens details. F2 renames. Alt+arrows moves dates; add Shift to resize. Space on a name reorders. C draws a Dependency. Delete removes.</p>
    {item && <Details key={item.id} chart={chart} item={item} readOnly={readOnly} onClose={() => setSelected(null)} edit={edit} />}
    <Dialog open={dialog === 'create'} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent><DialogTitle>New Item</DialogTitle><DialogDescription>Add a Task or Milestone to this Chart.</DialogDescription><NewItem chart={chart} edit={edit} close={() => setDialog(null)} /></DialogContent></Dialog>
    <Dialog open={dialog === 'settings'} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent className="max-h-[90vh] overflow-auto"><DialogTitle>Chart settings</DialogTitle><DialogDescription>Title, description, Holidays and Groups.</DialogDescription><Settings chart={chart} edit={edit} close={() => setDialog(null)} /></DialogContent></Dialog>
    <Dialog open={dialog === 'history'} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent className="max-h-[85vh] overflow-auto"><DialogTitle>Revisions</DialogTitle><DialogDescription>Every accepted change is recorded here.</DialogDescription><ol className="grid gap-3">{history?.map(revision => <li key={revision.id} className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><strong className="text-sm">{revision.kind}</strong>{revision.client && <p className="text-xs text-muted-foreground">{revision.client}</p>}<p className="text-xs text-muted-foreground">{new Date(revision.timestamp).toLocaleString()} · {revision.diffs.length} fields changed</p></div>{!readOnly && <Button variant="outline" size="sm" onClick={() => { void restore(revision.id).then(result => { setUndo(value => [...value,result.revisionId]); setRedo([]); setDialog(null); }).catch(error => report(error.message)); }}>Restore</Button>}</li>)}</ol></DialogContent></Dialog>
  </main>;
}
function NewItem({ chart, edit, close }: { chart: Chart; edit: EventEdit; close: () => void }) {
  const [milestone, setMilestone] = useState(false);
  const today = nextWorkingDay(new Date().toISOString().slice(0,10),chart.holidays,true);
  return <form className="grid gap-4" onSubmit={event => {
    event.preventDefault(); const form = new FormData(event.currentTarget), name = String(form.get('name')), start = String(form.get('start'));
    const item = milestone ? { name,on:start } : { name,start,end:String(form.get('end')) };
    const index = chart.items.findIndex(value => startOf(value) > start);
    void edit([{ type:'add', item,index:index < 0 ? chart.items.length : index }],event).then(ok => { if (ok) close(); });
  }}><div><Label htmlFor="new-name">Name</Label><Input id="new-name" name="name" autoFocus /></div><div><Label>Kind</Label><Select value={milestone ? 'Milestone' : 'Task'} onValueChange={value => setMilestone(value === 'Milestone')}><SelectTrigger aria-label="Item kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Task">Task</SelectItem><SelectItem value="Milestone">Milestone</SelectItem></SelectContent></Select></div><div><Label htmlFor="new-start">{milestone ? 'Date' : 'Start'}</Label><Input id="new-start" name="start" type="date" defaultValue={today} required /></div>{!milestone && <div><Label htmlFor="new-end">End</Label><Input id="new-end" name="end" type="date" defaultValue={today} required /></div>}<Button type="submit">Add Item</Button></form>;
}
function Settings({ chart, edit, close }: { chart: Chart; edit: EventEdit; close: () => void }) {
  const [groups,setGroups] = useState<Group[]>(chart.groups);
  return <form className="grid gap-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void edit([{ type:'chart',fields:{title:String(data.get('title')),description:String(data.get('description'))} }, {type:'holidays',dates:String(data.get('holidays')).split(/[\s,]+/).filter(Boolean)}, {type:'groups',groups}],event).then(ok => { if (ok) close(); }); }}><div><Label htmlFor="chart-title">Title</Label><Input id="chart-title" name="title" defaultValue={chart.title} /></div><div><Label htmlFor="chart-description">Description</Label><Textarea id="chart-description" name="description" defaultValue={chart.description} /></div><div><Label htmlFor="chart-holidays">Holidays</Label><Textarea id="chart-holidays" name="holidays" defaultValue={chart.holidays.join('\n')} /><p className="text-xs text-muted-foreground">Weekday dates, one YYYY-MM-DD per line. Item dates stay as they are.</p></div><Label>Groups</Label>{groups.map((group,index) => <div className="flex gap-2" key={group.id}><Input aria-label={`Group name ${index+1}`} value={group.name} onChange={event => setGroups(groups.map(value => value.id === group.id ? {...value,name:event.target.value} : value))} /><Select value={group.color} onValueChange={color => { if(color)setGroups(groups.map(value => value.id === group.id ? {...value,color:color as Group['color']} : value)); }}><SelectTrigger aria-label={`Group colour ${index+1}`}><SelectValue /></SelectTrigger><SelectContent>{palette.map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}</SelectContent></Select></div>)}<Button type="button" variant="outline" onClick={() => setGroups([...groups,{id:generateId('group',groups.map(value=>value.id)),name:'New Group',color:palette[groups.length%palette.length]}])}>Add Group</Button><Button type="submit">Save settings</Button></form>;
}
