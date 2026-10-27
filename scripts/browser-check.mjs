// Uses the locally installed Chrome and its native DevTools protocol. No packages required.
import http from 'node:http';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../frontend/dist/', import.meta.url)).replace(/\/$/, ''),profile=await mkdtemp(join(tmpdir(),'travelback-chrome-'));
let chrome,ws,server;const errors=[],pending=new Map();let seq=0,checks=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try {
  server=http.createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}const body=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
  chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let devPort;for(let i=0;i<80;i++){try{devPort=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(100);}}
  if(!devPort)throw new Error('Chrome DevTools did not start.');
  const targets=await(await fetch('http://127.0.0.1:'+devPort+'/json/list')).json();ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  ws.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p?.reject(new Error(data.error.message)):p?.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text+': '+(data.params.exceptionDetails.exception?.description||''));else if(data.method==='Runtime.consoleAPICalled'&&data.params.type==='error')errors.push(data.params.args.map(item=>item.value||item.description||'').join(' '));};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const wrapped=`(()=>{let state;try{state=JSON.parse(localStorage.getItem('travelback-finance-v2'));}catch{}const money=selector=>Number(document.querySelector(selector)?.textContent.replace(/[^0-9.-]/g,''));return (${expression});})()`;const r=await send('Runtime.evaluate',{expression:wrapped,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const check=async(expression,message)=>{
    let ok=false;
    for(let attempt=0;attempt<40;attempt++){ok=await evaluate(expression);if(ok)break;await pause(50);}
    if(!ok){console.log({message,expression,errors});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/travelback-failure.png',Buffer.from(shot.data,'base64'));}
    assert.ok(ok,message);checks++;
  };
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const set=values=>evaluate(`(()=>{const values=${JSON.stringify(values)};for(const [id,value] of Object.entries(values)){const element=document.getElementById(id);if(typeof value==='boolean'){if(element.checked!==value)element.click();}else{const prototype=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,String(value));element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));}}return true;})()`);
  const submit=form=>evaluate(`document.getElementById(${JSON.stringify(form)}).requestSubmit()`);
  const shot=async name=>{await pause(150);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('/private/tmp/travelback-'+name+'.png',Buffer.from(r.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:'+port});
  for(let i=0;i<50;i++){if(await evaluate('!!document.getElementById("budget-metrics")?.children.length'))break;await pause(100);}
  await evaluate('Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2000))])');
  await check(`document.title.includes("여행WON해")`,'title');
  await check(`document.querySelectorAll(".page:not([hidden])").length===1`,'one page visible');
  await check(`document.getElementById('country')?.value==='JP' && document.getElementById('hero-city')?.textContent==='도쿄.'`,'new visitor defaults to Japan');
  const preserved=await evaluate(`({expenses:JSON.stringify(state.expenses),receipts:JSON.stringify(state.receipts),budget:state.trip.budget})`);
  await evaluate(`(()=>{delete state.defaultCountryVersion;state.trip.country='FR';state.trip.city='파리';state.board={country:'FR',rate:1600,fee:200};localStorage.setItem('travelback-finance-v2',JSON.stringify(state));return true;})()`);
  await send('Page.reload');
  await check(`state?.defaultCountryVersion===1 && state.trip.country==='JP' && document.getElementById('country')?.value==='JP' && document.getElementById('hero-city')?.textContent==='도쿄.' && state.board===null`,'saved old Paris default migrates to Japan');
  await check(`JSON.stringify(state.expenses)===${JSON.stringify(preserved.expenses)} && JSON.stringify(state.receipts)===${JSON.stringify(preserved.receipts)} && state.trip.budget===${preserved.budget}`,'destination migration preserves financial records');
  await set({country:'FR',city:'파리'});await submit('setup');await send('Page.reload');
  await check(`state?.defaultCountryVersion===1 && state.trip.country==='FR' && document.getElementById('hero-city')?.textContent==='파리.'`,'later deliberate France selection survives reload');
  await set({country:'JP',city:'도쿄'});await submit('setup');
  await shot('home');
  for(const [country,city,korean,landmark] of [['FR','Paris','파리','에펠탑'],['JP','Tokyo','도쿄','도쿄 타워'],['TH','Bangkok','방콕','왓 아룬']]){
    await click('[data-tab="home"]');await set({country,city});await submit('setup');
    await check(`document.getElementById('hero-city').textContent===${JSON.stringify(korean+'.')}`,'Korean hero city '+country);
    await check(`document.querySelector('.landmark-art')?.dataset.country===${JSON.stringify(country)} && document.querySelector('.landmark-art').getAttribute('aria-label').includes(${JSON.stringify(landmark)}) && document.querySelector('.landmark-art svg').getBoundingClientRect().width>0`,'country landmark '+country);
    await shot('landmark-'+country);
  }
  await set({country:'JP',city:'Kyoto'});await submit('setup');
  await check(`document.getElementById('setup-msg').textContent.includes('한글') && state.trip.city==='방콕'`,'unknown Latin city requires Korean input');
  await set({city:'교토'});await submit('setup');
  await check(`document.getElementById('hero-city').textContent==='교토.'`,'custom Korean city preserved');
  await set({country:'FR',city:'파리'});await submit('setup');
  for(const page of ['home','atm','tax','budget']){await click(`[data-tab="${page}"]`);await check(`!document.getElementById('${page}').hidden`,'navigation '+page);await check(`document.documentElement.scrollWidth<=innerWidth`,'desktop overflow '+page);if(page!=='home')await shot(page);}
  await click('[data-tab="tax"]');await check(`document.querySelectorAll("#optimization-table tr").length===9`,'nine combinations');await check(`document.querySelectorAll(".receipt-row.selected").length===1`,'active receipt visible');
  await click('#link-receipt');await check(`state.expenses.length===6`,'receipt linked');await click('#link-receipt');await check(`state.expenses.length===6`,'receipt link dedup');
  await click('[data-tab="budget"]');await click('[data-actual]');await set({'actual-refund':70000});await submit('actual-refund-form');await check(`money('#budget-metrics .metric:nth-child(3) strong')===70000`,'actual refund reflected');await check(`money('#budget-metrics .metric:nth-child(2) strong')===0`,'pending cleared');
  const before=await evaluate(`money('#ai-report strong')`);await set({'expense-name':'시연 ATM 인출','expense-amount':100,'expense-type':'atm','expense-date':'2026-11-12'});await submit('expense-form');await check(`money('#ai-report strong')===${before+4740}`,'transfer principal excluded');
  await click('[data-filter="transfer"]');await check(`document.querySelectorAll("#expenses tr").length===1`,'transfer filter');await click('[data-filter="all"]');
  await click('[data-tab="tax"]');await set({store:'서류 없는 구매','purchase-amount':200,'refund-doc':'no','purchase-date':'2026-11-13'});await submit('tax-form');await check(`document.querySelectorAll("#optimization-table tr").length===1 && document.getElementById("link-receipt").disabled`,'missing documentation blocks calculations');
  await submit('tax-form');await check(`state.receipts.length===2`,'duplicate receipt blocked');
  await click('[data-tab="atm"]');await set({needed:150,cash:80,balance:0,'topup-supported':false,'cash-krw':0});await submit('atm-form');await check(`document.querySelectorAll('#atm-results .candidate').length===0`,'unsupported cash paths excluded');
  await set({balance:250,'topup-supported':true,'cash-krw':300000});await submit('atm-form');await check(`document.querySelectorAll('#atm-results .candidate').length===3`,'cash alternatives recover');
  await click('#rate-upload-open');await set({'board-rate':1600,'board-fee':200,'board-confirm':true});await submit('rate-form');await check(`state.board.rate===1600 && [...document.querySelectorAll('#atm-results .candidate')].some(item=>item.querySelector('[data-candidate="c"]')&&item.querySelector('strong').textContent==='112,200원')`,'manual rate verification applied');
  await set({'cash-prompt':'現金 3,000바트 필요해'});await submit('cash-prompt-form');await check(`document.getElementById("cash-prompt-status").textContent.includes("달라")`,'currency mismatch prompts clarification');
  await click('[data-tab="home"]');await set({country:'TH',city:'방콕','trip-budget':4000000,'trip-cash':100,card:'none',account:false});await submit('setup');await check(`state.trip.country==="TH" && state.board===null`,'country change resets exchange board');await check(`[...document.querySelectorAll('#atm-results [data-candidate]')].every(item=>item.dataset.candidate==='c')`,'no-card alternatives');
  await click('[data-tab="tax"]');await check(`document.querySelector("#tax-form button.primary").disabled`,'unimplemented country rules excluded');
  await click('#chat-toggle');await set({'chat-input':'우리카드로 환급받을 수 있어?'});await submit('chat-form');await check(`document.getElementById("chat-messages").lastElementChild.textContent.includes("보장")`,'chat marks unsupported refund integration');await click('#chat-close');
  await send('Page.reload');await pause(400);await check(`state.trip.country==="TH" && state.expenses.length===7`,'persistence');
  await click('[data-tab="home"]');await set({country:'FR',city:'파리',card:'travel',account:true,'trip-cash':80});await submit('setup');
  await click('[data-tab="tax"]');await set({store:'즉시환급 시연 매장','purchase-amount':500,'purchase-date':'2026-11-14','purchase-method':'standard','refund-doc':'yes','tax-eligible':true,'instant-supported':true});await submit('tax-form');await click('[data-refund="store"]');await click('#link-receipt');await check(`state.expenses.at(-1).cost===720243 && state.expenses.at(-1).expectedRefund===0 && state.expenses.at(-1).actualRefund===0`,'instant refund deducted once');
  for(const width of [390,768]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});for(const page of ['home','atm','tax','budget']){await click(`[data-tab="${page}"]`);await check(`document.documentElement.scrollWidth<=innerWidth`,width+'px overflow '+page);if(width===390)await shot('mobile-'+page);}}
  await check("!Array.from(document.scripts).some(x=>x.src.includes('undefined'))",'asset paths valid');assert.deepEqual(errors,[],'browser exceptions');
  console.log(JSON.stringify({passed:checks,exceptions:errors,screenshots:'/private/tmp/travelback-*.png'}));
} finally {ws?.close();chrome?.kill('SIGTERM');server?.close();await pause(300);await rm(profile,{recursive:true,force:true});}
