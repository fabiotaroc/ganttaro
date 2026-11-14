import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const origin=process.argv[2]??'http://localhost:3101';
const client=new Client({name:'Milestone browser verification',version:'1.0.0'});
await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), { requestInit: { headers: process.env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': process.env.VERCEL_OIDC_TOKEN } : {} } }));
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
if(process.env.VERCEL_OIDC_TOKEN)await context.route('**/*',route=>{const url=new URL(route.request().url());return route.continue({headers:{...route.request().headers(),...(url.origin===origin?{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}:{})}});});
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
 const qa=await page.locator('.gantt-bar[data-item-id="qa"]').boundingBox();
 await page.mouse.move(qa.x+qa.width/2,qa.y+qa.height/2);await page.mouse.down();await page.mouse.move(qa.x+qa.width/2-72,qa.y+qa.height/2+5,{steps:12});await page.mouse.up();
 await page.locator('.gantt-bar[data-item-id="qa"][data-conflict]').waitFor();
 const designOut=await page.locator('.gantt-bar[data-item-id="design"] .gantt-port.out').boundingBox();
 const feedbackIn=await page.locator('.gantt-bar[data-item-id="feedback"] .gantt-port.in').boundingBox();
 await page.mouse.move(designOut.x+3,designOut.y+3);await page.mouse.down();await page.mouse.move(feedbackIn.x+3,feedbackIn.y+3,{steps:20});await page.mouse.up();
 const drawn=await call('get_items',{link:chart.editLink,ids:['feedback']});assert(drawn.items[0].after.includes('design'));
 const feedbackOut=await page.locator('.gantt-bar[data-item-id="feedback"] .gantt-port.out').boundingBox();const designIn=await page.locator('.gantt-bar[data-item-id="design"] .gantt-port.in').boundingBox();
 await page.mouse.move(feedbackOut.x+3,feedbackOut.y+3);await page.mouse.down();await page.mouse.move(designIn.x+3,designIn.y+3,{steps:20});await page.mouse.up();
 await page.getByRole('alert').filter({hasText:'loop'}).waitFor();
 assert.equal((await call('get_items',{link:chart.editLink,ids:['design']})).items[0].after,undefined);
 await page.getByRole('button',{name:'Dismiss',exact:true}).click();
 const current=await call('get_items',{link:chart.editLink,ids:['api']});assert.equal(current.items[0].name,'Build API renamed');
 const bridge=await page.evaluate(async()=>{const snapshot=window.ganttaro.snapshot();const result=await window.ganttaro.act({steps:[{ref:'Chart',action:'set_dependencies',args:['docs',['design']]}]});return{components:snapshot.filter(item=>!item.offPage).length,ok:result.ok};});
 assert.equal(bridge.components,1);assert.equal(bridge.ok,true);
 const staleVersion=(await call('get_items',{link:chart.editLink,ids:['api']})).items[0].version;
 await page.locator('.gantt-name[data-item-id="api"]').dblclick();const newerName=page.getByRole('textbox',{name:'Rename Build API renamed',exact:true});await newerName.fill('Build API ready');await newerName.press('Enter');
 await viewer.locator('.gantt-name[data-item-id="api"]').filter({hasText:'Build API ready'}).waitFor();
 const stale=await call('update_items',{link:chart.editLink,items:[{id:'api',version:staleVersion,fields:{end:'2026-11-18'}}]});assert.equal(stale.ok,false);
 const fresh=await call('get_items',{link:chart.editLink,ids:['api']});assert.equal((await call('update_items',{link:chart.editLink,items:[{id:'api',version:fresh.items[0].version,fields:{end:'2026-11-18'}}]})).ok,true);
 await viewer.getByRole('gridcell',{name:/Build API ready: 2026-11-17 to 2026-11-18/}).waitFor();
 await page.evaluate(()=>{document.querySelector('.gantt-bar[data-item-id="api"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true}));});
 await page.getByRole('dialog',{name:'Confirm Agent Edit'}).waitFor();assert.equal(await page.locator('.gantt-row').count(),10);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 const added=await page.evaluate(()=>window.ganttaro.act({steps:[{ref:'Chart',action:'add_items',args:[[{id:'temporary',name:'Temporary Item',on:'2026-11-26'}]]}]}));assert.equal(added.ok,true);
 await page.locator('.gantt-bar[data-item-id="temporary"]').waitFor();
 await page.evaluate(()=>{window.__deleteResult=window.ganttaro.act({steps:[{ref:'Chart',action:'remove',args:['temporary']}]});});
 await page.getByRole('dialog',{name:'Confirm Agent Edit'}).waitFor();await page.getByRole('button',{name:'Allow Agent Edit',exact:true}).click();
 assert.equal((await page.evaluate(()=>window.__deleteResult)).ok,true);await page.locator('.gantt-bar[data-item-id="temporary"]').waitFor({state:'detached'});
 const history=await call('list_revisions',{link:chart.editLink});assert(history.some(rev=>rev.kind==='Manual'));assert(history.some(rev=>rev.kind==='Agent (Bridge)'));
 for(const format of ['PNG','PDF']){const download=page.waitForEvent('download');await page.getByRole('button',{name:format,exact:true}).click();await(await download).saveAs(`/tmp/ganttaro-chrome.${format.toLowerCase()}`);}
 const home=await context.newPage();await home.goto(origin);await home.getByRole('button',{name:'＋ New chart',exact:true}).click();await home.getByRole('dialog',{name:'Your Chart is ready'}).waitFor();
 const newEdit=await home.locator('#copy-edit').inputValue(),newView=await home.locator('#copy-view').inputValue();assert.notEqual(newEdit,newView);
 await home.getByRole('link',{name:'Open Chart',exact:true}).click();await home.getByRole('grid',{name:'Chart'}).waitFor();assert.equal(await home.locator('.gantt-row').count(),0);
 await home.goto(origin);const entry=home.locator('.home-recent li').filter({hasText:'Untitled Chart'});await entry.getByRole('button',{name:'Remove from list'}).click();assert.equal(await entry.count(),0);assert.equal((await call('get_chart',{link:newEdit})).items.length,0);await home.close();
 await page.screenshot({path:'/tmp/ganttaro-chart.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: Chrome rendering; hidden weekends; live View Link; drag Conflict; drawn Dependency and loop refusal; Manual rename plus stale MCP refusal/retry; Bridge edits; programmatic delete confirmation; PNG/PDF downloads; New chart links and browser-local removal.');
}catch(error){await page.screenshot({path:'/tmp/ganttaro-browser-failure.png',fullPage:true});console.log('Browser error diagnostics:',JSON.stringify(errors));throw error;}finally{await browser.close();await client.close();}
