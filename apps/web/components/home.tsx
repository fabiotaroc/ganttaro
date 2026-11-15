'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { useMutation } from 'convex/react';
import { PlusIcon } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';
import { markCreated } from '@/components/chart/share';
import { readRecent, recentSnapshot, recordRecent, removeRecent, subscribeRecent } from '@/lib/recent';
function randomKey() { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
export function Home() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribeRecent,recentSnapshot,()=>'[]');
  const recent = snapshot === '[]' ? [] : readRecent();
  const [creating,setCreating] = useState(false), [error,setError] = useState('');
  const create = useMutation(api.charts.write);
  return <main className="home-page"><header className="chart-topbar"><Wordmark /></header><section className="home-hero"><h1>Make a Gantt chart.<br /><span>Share it with a link.</span></h1><p>Add Tasks and Milestones, set their dates, and draw Dependencies between them. Anyone with the link can view or edit. No sign-up needed.</p><Button size="lg" className="pl-2.5 pr-3.5" disabled={creating} onClick={event => {
    const trusted = event.nativeEvent.isTrusted; setCreating(true);setError('');
    const key=randomKey(),viewKey=randomKey();
    void create({key,kind:trusted?'Manual':'Agent (Bridge)',...(!trusted?{client:'Browser agent'}:{}),create:{viewKey,title:'Untitled Chart'}}).then(result=>{
      if(!result.ok)throw new Error(result.reasons.join('; '));
      recordRecent({key,title:'Untitled Chart',opened:Date.now(),access:'Edit'});
      markCreated(key);
      router.push(`/c/${key}`);
    }).catch(error=>{setError(error.message);setCreating(false);});
  }}><PlusIcon />{creating?'Creating…':'New Chart'}</Button>{error&&<p role="alert" className="text-destructive">{error}</p>}</section>
  <section className="home-recent"><div className="flex items-baseline justify-between"><h2>Recent Charts</h2><p className="text-xs text-muted-foreground">Saved in this browser</p></div>{recent.length?<ul>{recent.map(chart=><li key={chart.key}><Link href={`/${chart.access==='Edit'?'c':'v'}/${chart.key}`}><strong>{chart.title||'Untitled Chart'}</strong><span>{chart.access==='Edit'?'Can edit':'View only'} · Opened {new Date(chart.opened).toLocaleDateString()}</span></Link><Button variant="ghost" size="sm" className="text-muted-foreground" onClick={()=>removeRecent(chart.key)}>Remove from list</Button></li>)}</ul>:<div className="home-empty"><p>No Charts yet.</p><small>Charts you create or open appear here, in this browser only.</small></div>}</section>
  </main>;
}
