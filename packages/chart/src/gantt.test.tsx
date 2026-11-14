// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { Gantt } from './gantt-react';
import type { Chart } from '@ganttaro/core';
beforeAll(() => {
  Element.prototype.getAnimations = () => [];
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.checkVisibility = () => true;
  document.elementFromPoint = () => null;
  document.elementsFromPoint = () => [];
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});
afterEach(cleanup);
const chart: Chart = { id:'ch-test',title:'Test',version:1,zoom:'weeks',holidays:['2026-11-17'],groups:[],items:[{id:'api',name:'API',start:'2026-11-16',end:'2026-11-20',version:1},{id:'kickoff',name:'Kickoff',on:'2026-11-16',version:1}] };
const tick = () => act(() => new Promise(resolve=>setTimeout(resolve,0)));
function props(readOnly=false) { return {chart,start:'2026-11-16',end:'2026-11-30',readOnly,onEdit:vi.fn(async()=>({ok:true})),onOpen:vi.fn(),onError:vi.fn(),onRestore:vi.fn(async()=>({ok:true})),onHistory:vi.fn(()=>[]),onHoliday:vi.fn(),onDisconnect:vi.fn()}; }
test('renders a named grid, real dates, Milestones, Holiday columns and hidden annotation IDs',async()=>{
  const options=props();render(<Gantt {...options}/>);await tick();
  expect(screen.getByRole('grid',{name:'Chart'}).getAttribute('aria-colcount')).toBe('2');
  const cells=screen.getAllByRole('gridcell'); expect(cells).toHaveLength(4);
  expect(screen.getByRole('gridcell',{name:/API: 2026/}).dataset.itemId).toBe('api');
  expect(screen.getByRole('button',{name:'2026-11-17, Holiday'}).dataset.holiday).toBe('true');
  expect(screen.getByRole('gridcell',{name:/Kickoff: 2026/}).dataset.milestone).toBe('true');
  expect(screen.queryByText('api')).toBeNull();
});
test('keyboard movement skips Holidays and keeps real dates at the primitive boundary',async()=>{
  const options=props();render(<Gantt {...options}/>);await tick();
  fireEvent.keyDown(screen.getByRole('gridcell',{name:/API: 2026/}),{key:'ArrowRight',altKey:true});
  expect(options.onEdit).toHaveBeenCalledWith([{type:'update',id:'api',version:1,fields:{start:'2026-11-18',end:'2026-11-23'}}],expect.objectContaining({source:'programmatic'}));
});
test('View Links retain navigation and details, with no edit from keyboard',async()=>{
  const options=props(true);render(<Gantt {...options}/>);await tick();
  const cell=screen.getByRole('gridcell',{name:/API: 2026/});
  fireEvent.keyDown(cell,{key:'Delete'});fireEvent.keyDown(cell,{key:'ArrowRight',altKey:true});expect(options.onEdit).not.toHaveBeenCalled();
  fireEvent.keyDown(cell,{key:'Enter'});expect(options.onOpen).toHaveBeenCalledWith('api');
  expect(screen.getByRole('button',{name:'2026-11-17, Holiday'})).toHaveProperty('disabled',true);
});
