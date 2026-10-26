// Uses the locally installed Chrome and its native DevTools protocol. No packages required.
import http from 'node:http';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve('dist'),profile=await mkdtemp(join(tmpdir(),'travelback-chrome-'));
let chrome,ws,server;const errors=[],pending=new Map();let seq=0,checks=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try {
  server=http.createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}const body=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
  chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let devPort;for(let i=0;i<80;i++){try{devPort=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(100);}}
  if(!devPort)throw new Error('Chrome DevTools did not start.');
  const targets=await(await fetch('http://127.0.0.1:'+devPort+'/json/list')).json();ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  ws.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p?.reject(new Error(data.error.message)):p?.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text+': '+(data.params.exceptionDetails.exception?.description||''));};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const check=async(expression,message)=>{const ok=await evaluate(expression);if(!ok){console.log(message,await evaluate("JSON.stringify([...document.querySelectorAll("*")].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,cls:e.className,right:Math.round(e.getBoundingClientRect().right)})).slice(0,15))"));const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/travelback-failure.png',Buffer.from(shot.data,'base64'));}assert.ok(ok,message);checks++;};
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const set=values=>evaluate(`(()=>{const values=${JSON.stringify(values)};for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(typeof value==='boolean')el.checked=value;else el.value=value;}return true;})()`);
  const submit=form=>evaluate(`document.getElementById(${JSON.stringify(form)}).requestSubmit()`);
  const shot=async name=>{await pause(150);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('/private/tmp/travelback-'+name+'.png',Buffer.from(r.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:'+port});
  for(let i=0;i<50;i++){if(await evaluate('!!document.getElementById("budget-metrics")?.children.length'))break;await pause(100);}
  await evaluate('Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2000))])');
  await check('document.title.includes("TravelBack")','title');
  await check('document.querySelectorAll(".page:not([hidden])").length===1','one page visible');
  await shot('home');
  for(const page of ['home','atm','tax','budget']){await click(`[data-tab="${page}"]`);await check(`!document.getElementById('${page}').hidden`,'navigation '+page);await check('document.documentElement.scrollWidth<=innerWidth','desktop overflow '+page);if(page!=='home')await shot(page);}
  await click('[data-tab="tax"]');await check('document.querySelectorAll("#optimization-table tr").length===9','nine combinations');await check('document.querySelectorAll(".receipt-row.selected").length===1','active receipt visible');
  await click('#link-receipt');await check('state.expenses.length===6','receipt linked');await click('#link-receipt');await check('state.expenses.length===6','receipt link dedup');
  await click('[data-tab="budget"]');await click('[data-actual]');await set({'actual-refund':70000});await submit('actual-refund-form');await check('TravelBack.ledgerSummary(state.expenses).actual===70000','actual refund reflected');await check('TravelBack.ledgerSummary(state.expenses).pending===0','pending cleared');
  const before=await evaluate('TravelBack.ledgerSummary(state.expenses).gross');await set({'expense-name':'시연 ATM 인출','expense-amount':100,'expense-type':'atm','expense-date':'2026-11-12'});await submit('expense-form');await check(`TravelBack.ledgerSummary(state.expenses).gross===${before+4740}`,'transfer principal excluded');
  await click('[data-filter="transfer"]');await check('document.querySelectorAll("#expenses tr").length===1','transfer filter');await click('[data-filter="all"]');
  await click('[data-tab="tax"]');await set({store:'서류 없는 구매','purchase-amount':200,'refund-doc':'no','purchase-date':'2026-11-13'});await submit('tax-form');await check('document.querySelectorAll("#optimization-table tr").length===1 && document.getElementById("link-receipt").disabled','missing documentation blocks calculations');
  await submit('tax-form');await check('state.receipts.length===2','duplicate receipt blocked');
  await click('[data-tab="atm"]');await set({needed:150,cash:80,balance:0,'topup-supported':false,'cash-krw':0});await submit('atm-form');await check('currentCash.candidates.length===0','unsupported cash paths excluded');
  await set({balance:250,'topup-supported':true,'cash-krw':300000});await submit('atm-form');await check('currentCash.candidates.length===3','cash alternatives recover');
  await click('#rate-upload-open');await set({'board-rate':1600,'board-fee':200,'board-confirm':true});await submit('rate-form');await check('state.board.rate===1600 && currentCash.candidates.find(x=>x.id==="c").cost===112200','manual rate verification applied');
  await set({'cash-prompt':'現金 3,000바트 필요해'});await submit('cash-prompt-form');await check('document.getElementById("cash-prompt-status").textContent.includes("달라")','currency mismatch prompts clarification');
  await click('[data-tab="home"]');await set({country:'TH',city:'방콕','trip-budget':4000000,'trip-cash':100,card:'none',account:false});await submit('setup');await check('state.trip.country==="TH" && state.board===null','country change resets exchange board');await check('currentCash.candidates.every(x=>x.id==="c")','no-card alternatives');
  await click('[data-tab="tax"]');await check('document.querySelector("#tax-form button.primary").disabled','unimplemented country rules excluded');
  await click('#chat-toggle');await set({'chat-input':'우리카드로 환급받을 수 있어?'});await submit('chat-form');await check('document.getElementById("chat-messages").lastElementChild.textContent.includes("보장")','chat marks unsupported refund integration');await click('#chat-close');
  await send('Page.reload');await pause(400);await check('state.trip.country==="TH" && state.expenses.length===7','persistence');
  await click('[data-tab="home"]');await set({country:'FR',city:'파리',card:'travel',account:true,'trip-cash':80});await submit('setup');
  await click('[data-tab="tax"]');await set({store:'즉시환급 시연 매장','purchase-amount':500,'purchase-date':'2026-11-14','purchase-method':'standard','refund-doc':'yes','tax-eligible':true,'instant-supported':true});await submit('tax-form');await click('[data-refund="store"]');await click('#link-receipt');await check('state.expenses.at(-1).cost===TravelBack.paymentCost(450,"standard",1580) && state.expenses.at(-1).expectedRefund===0 && state.expenses.at(-1).actualRefund===0','instant refund deducted once');
  for(const width of [390,768]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});for(const page of ['home','atm','tax','budget']){await click(`[data-tab="${page}"]`);await check('document.documentElement.scrollWidth<=innerWidth',width+'px overflow '+page);if(width===390)await shot('mobile-'+page);}}
  await check("!Array.from(document.scripts).some(x=>x.src.includes('undefined'))",'asset paths valid');assert.deepEqual(errors,[],'browser exceptions');
  console.log(JSON.stringify({passed:checks,exceptions:errors,screenshots:'/private/tmp/travelback-*.png'}));
} finally {ws?.close();chrome?.kill('SIGTERM');server?.close();await pause(300);await rm(profile,{recursive:true,force:true});}
