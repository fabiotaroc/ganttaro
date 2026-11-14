import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const origin=process.argv[2]??'http://localhost:3101';
const client=new Client({name:'Milestone browser verification',version:'1.0.0'});
await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`)));
const call=async(name,args)=>{const result=await client.callTool({name,arguments:args});return JSON.parse(result.content[0].text);};
const chart=await call('create_chart',{title:'Leadabeelity rollout',description:'A shared plan for the first release.',holidays:['2026-12-08'],groups:[{id:'build',name:'Build',color:'indigo'},{id:'delivery',name:'Delivery',color:'teal'}],items:[
 {id:'kickoff',name:'Kickoff',on:'2026-11-16'},
 {id:'api',name:'Build API',start:'2026-11-17',end:'2026-11-20',after:['kickoff'],group:'build',owners:['Marco'],description:'Implement the shared API.'},
 {id:'design',name:'Design',start:'2026-11-17',end:'2026-11-19',group:'build'},
 {id:'qa',name:'QA',start:'2026-11-23',end:'2026-11-27',after:['api'],group:'delivery'},
 {id:'docs',name:'Documentation',start:'2026-11-23',end:'2026-11-25',group:'delivery'},
 {id:'integration',name:'Integration',start:'2026-11-30',end:'2026-12-04',after:['qa'],group:'build'},
 {id:'feedback',name:'Feedback',start:'2026-11-30',end:'2026-12-02',group:'delivery'},
 {id:'rollout',name:'Rollout',start:'2026-12-07',end:'2026-12-09',after:['integration'],group:'delivery'},
 {id:'review',name:'Review',on:'2026-12-10',after:['rollout']},
 {id:'launch',name:'Launch',on:'2026-12-11',after:['review']},
]});assert.equal(chart.ok,true);
await fs.writeFile('/tmp/ganttaro-browser-links.json',JSON.stringify(chart),{mode:0o600});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
const page=await context.newPage(),viewer=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(chart.editLink);await page.getByRole('grid',{name:'Chart'}).waitFor();
 await viewer.goto(chart.viewLink);await viewer.getByRole('grid',{name:'Chart'}).waitFor();
 assert.equal(await page.locator('.gantt-row').count(),10);assert.equal(await viewer.getByRole('button',{name:'＋ New Item',exact:true}).count(),0);
 assert.equal(await page.locator('.gantt-days button').evaluateAll(elements=>elements.every(el=>![0,6].includes(new Date(el.getAttribute('aria-label').slice(0,10)).getUTCDay()))),true);
 await page.locator('.gantt-name[data-item-id="api"]').dblclick();
 const rename=page.getByRole('textbox',{name:'Rename Build API',exact:true});await rename.fill('Build API renamed');await rename.press('Enter');
 await viewer.locator('.gantt-name[data-item-id="api"]').filter({hasText:'Build API renamed'}).waitFor();
 const current=await call('get_items',{link:chart.editLink,ids:['api']});assert.equal(current.items[0].name,'Build API renamed');
 const bridge=await page.evaluate(async()=>{const snapshot=window.ganttaro.snapshot();const result=await window.ganttaro.act({steps:[{ref:'Chart',action:'set_dependencies',args:['docs',['design']]}]});return{components:snapshot.filter(item=>!item.offPage).length,ok:result.ok};});
 assert.equal(bridge.components,1);assert.equal(bridge.ok,true);
 const history=await call('list_revisions',{link:chart.editLink});assert(history.some(rev=>rev.kind==='Manual'));assert(history.some(rev=>rev.kind==='Agent (Bridge)'));
 for(const format of ['PNG','PDF']){const download=page.waitForEvent('download');await page.getByRole('button',{name:format,exact:true}).click();await(await download).saveAs(`/tmp/ganttaro-chrome.${format.toLowerCase()}`);}
 await page.screenshot({path:'/tmp/ganttaro-chart.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: Chrome Chart rendering, hidden weekends, live View Link, Manual Edit rename, Bridge Dependency, Revision source kinds and PNG/PDF downloads.');
}catch(error){await page.screenshot({path:'/tmp/ganttaro-browser-failure.png',fullPage:true});console.log('Browser error diagnostics:',JSON.stringify(errors));throw error;}finally{await browser.close();await client.close();}
