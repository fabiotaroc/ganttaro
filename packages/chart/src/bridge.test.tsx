// @vitest-environment jsdom
import { useState } from 'react';
import { act,cleanup,render } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { afterEach,beforeAll,expect,test,vi } from 'vitest';
import { applyChanges, type Chart } from '@ganttaro/core';
import { Gantt } from './gantt-react';
beforeAll(()=>{
  Element.prototype.getAnimations=()=>[];Element.prototype.scrollIntoView=()=>{};Element.prototype.checkVisibility=()=>true;
  document.elementFromPoint=()=>null;document.elementsFromPoint=()=>[];
  globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
});
afterEach(cleanup);
let approve=false;
const agent=createAgent({allow:step=>step.action!=='remove'||approve});
const initial:Chart={id:'chart',title:'Test',version:1,zoom:'weeks',holidays:[],groups:[],items:[{id:'a',name:'A',start:'2026-11-16',end:'2026-11-20',version:1},{id:'b',name:'B',on:'2026-11-23',version:1}]};
const saved=vi.fn(),restored=vi.fn(async()=>({ok:true}));
function Harness({data=initial,readOnly=false}:{data?:Chart;readOnly?:boolean}){
  const [chart,setChart]=useState(data);
  return <Gantt chart={chart} start="2026-11-01" end="2026-12-31" readOnly={readOnly} onEdit={async(changes,details)=>{saved(changes,details);const result=applyChanges(chart,changes);if(!result.ok)throw Error(result.reasons.join('; '));setChart(result.chart);return result;}} onOpen={()=>{}} onError={()=>{}} onRestore={restored} onHistory={()=>[{id:'revision'}]} onHoliday={()=>{}} onDisconnect={()=>{}}/>;
}
const tick=()=>act(()=>new Promise(resolve=>setTimeout(resolve,0)));
async function run(action:string,args:unknown[]=[]){let result:Awaited<ReturnType<typeof agent.act>>;await act(async()=>{result=await agent.act({steps:[{ref:'Chart',action,args}]});});await tick();return result!;}
test('one Chart exposes compact JSON and all actions; every action can execute',async()=>{
  saved.mockClear();render(<Harness/>);await tick();
  const entries=agent.snapshot().filter(entry=>!entry.offPage);
  expect(entries).toHaveLength(1);expect(entries[0].label).toBe('Chart');
  expect(entries[0].actions).toEqual(expect.arrayContaining(['get_chart','get_items','describe','list_revisions','add_items','update_items','remove','set_dependencies','set_holidays','tidy','update_chart','set_groups','reorderItems','restore_revision']));
  expect(JSON.stringify(entries)).toContain('2026-11-16');
  for(const action of ['get_chart','describe','list_revisions'])expect((await run(action)).ok).toBe(true);
  expect((await run('get_items',[['a']])).ok).toBe(true);
  expect((await run('add_items',[[{id:'c',name:'C',on:'2026-11-24'}]])).ok).toBe(true);
  expect((await run('update_items',[[{id:'a',fields:{name:'A renamed'}}]])).ok).toBe(true);
  expect(saved.mock.calls.at(-1)?.[1].source).toBe('agent');
  expect((await run('set_dependencies',['b',['a']])).ok).toBe(true);
  expect((await run('set_dependencies',['a',['b']])).ok).toBe(false);
  expect((await run('set_holidays',[['2026-11-17']])).ok).toBe(true);
  expect((await run('tidy')).ok).toBe(true);
  expect((await run('update_chart',[{title:'Updated'}])).ok).toBe(true);
  expect((await run('set_groups',[[{id:'build',name:'Build',color:'indigo'}]])).ok).toBe(true);
  expect((await run('reorderItems',[['c','b','a']])).ok).toBe(true);
  expect((await run('restore_revision',['revision'])).ok).toBe(true);expect(restored).toHaveBeenCalledWith('revision');
  approve=false;expect((await run('remove',['c'])).ok).toBe(false);
  approve=true;expect((await run('remove',['c'])).ok).toBe(true);
  expect((await run('add_items',[[{name:'One',on:'2026-11-24'},{name:'Two',on:'2026-11-25'}]])).ok).toBe(false);
});
test('View Links expose only read actions and refuse write attempts',async()=>{
  render(<Harness readOnly/>);await tick();const entry=agent.snapshot().find(entry=>!entry.offPage)!;
  expect([...entry.actions].sort()).toEqual(['get_chart','get_items','describe','list_revisions'].sort());
  expect((await run('update_chart',[{title:'No'}])).ok).toBe(false);
  expect((await run('remove',['a'])).ok).toBe(false);
});
test('60 Items include full JSON; 61 Items show a summary and describe stays available',async()=>{
  const many=(count:number):Chart=>({...initial,items:Array.from({length:count},(_,i)=>({id:`task-${i}`,name:`Task ${i}`,on:'2026-11-16',version:1}))});
  const first=render(<Harness data={many(60)}/>);await tick();
  expect(JSON.stringify(agent.snapshot().filter(entry=>!entry.offPage))).toContain('Task 59');
  first.unmount();render(<Harness data={many(61)}/>);await tick();
  const snapshot=JSON.stringify(agent.snapshot().filter(entry=>!entry.offPage));expect(snapshot).toContain('itemCount');expect(snapshot).not.toContain('Task 60');
  const full=await run('describe');expect(JSON.stringify(full)).toContain('Task 60');
});
