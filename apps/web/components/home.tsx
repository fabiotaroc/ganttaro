'use client';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { readRecent, recentSnapshot, recordRecent, removeRecent, subscribeRecent } from '@/lib/recent';
function randomKey() { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
export function Home() {
  const snapshot = useSyncExternalStore(subscribeRecent,recentSnapshot,()=>'[]');
  const recent = snapshot === '[]' ? [] : readRecent();
  const [links,setLinks] = useState<{edit:string;view:string}|null>(null);
  const [creating,setCreating] = useState(false), [error,setError] = useState(''), [copied,setCopied] = useState('');
  const create = useMutation(api.charts.write);
  return <main className="home-page"><header className="chart-topbar"><span className="wordmark">ganttaro<span>↗</span></span><span className="text-xs text-muted-foreground">Shared timelines, together.</span></header><section className="home-hero"><p className="eyebrow">For people. And their agents.</p><h1>A shared timeline.<br /><span>Room for everyone.</span></h1><p>Plan the work, connect the pieces, and keep everyone on the same Chart. No accounts. Just a link.</p><Button size="lg" disabled={creating} onClick={event => {
    const trusted = event.nativeEvent.isTrusted; setCreating(true);setError('');
    const key=randomKey(),viewKey=randomKey();
    void create({key,kind:trusted?'Manual':'Agent (Bridge)',...(!trusted?{client:'Browser agent'}:{}),create:{viewKey,title:'Untitled Chart'}}).then(result=>{
      if(!result.ok)throw new Error(result.reasons.join('; '));
      recordRecent({key,title:'Untitled Chart',opened:Date.now(),access:'Edit'});
      setLinks({edit:`${location.origin}/c/${key}`,view:`${location.origin}/v/${viewKey}`});
    }).catch(error=>setError(error.message)).finally(()=>setCreating(false));
  }}>{creating?'Creating…':'＋ New chart'}</Button>{error&&<p role="alert" className="text-destructive">{error}</p>}</section>
  <section className="home-recent"><div className="flex items-baseline justify-between"><h2>Recent charts</h2><p className="text-xs text-muted-foreground">Saved in this browser</p></div>{recent.length?<ul>{recent.map(chart=><li key={chart.key}><Link href={`/${chart.access==='Edit'?'c':'v'}/${chart.key}`}><strong>{chart.title||'Untitled Chart'}</strong><span>{chart.access} Link · Last opened {new Date(chart.opened).toLocaleDateString()}</span></Link><Button variant="ghost" size="sm" onClick={()=>removeRecent(chart.key)}>Remove from list</Button></li>)}</ul>:<div className="home-empty"><span>↗</span><p>Your next project starts here.</p><small>Charts you open will appear in this browser’s list.</small></div>}</section>
  <Dialog open={!!links} onOpenChange={open=>{if(!open)setLinks(null);}}><DialogContent><DialogTitle>Your Chart is ready</DialogTitle><DialogDescription>Save both links now. Anyone with the Edit Link can change this Chart; the View Link only lets them view it.</DialogDescription>{links&&<div className="grid gap-5">{(['edit','view'] as const).map(kind=><div key={kind}><Label htmlFor={`copy-${kind}`}>{kind==='edit'?'Edit Link':'View Link'}</Label><div className="flex gap-2"><Input id={`copy-${kind}`} readOnly value={links[kind]} /><Button variant="outline" onClick={()=>{void navigator.clipboard.writeText(links[kind]).then(()=>setCopied(kind));}}>{copied===kind?'Copied':'Copy'}</Button></div></div>)}<Button render={<Link href={new URL(links.edit).pathname}/>}>Open Chart</Button></div>}</DialogContent></Dialog>
  </main>;
}
