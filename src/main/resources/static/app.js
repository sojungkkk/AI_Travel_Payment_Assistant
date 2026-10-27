'use strict';
const T = TravelBack, $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
const foreign = (n, country = state.trip.country) => T.countries[country].symbol + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const id = () => globalThis.crypto?.randomUUID?.() || 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const colors = { 음식:'#345847', 쇼핑:'#b7cb91', 교통:'#d8bc85', 숙박:'#6e9275', 관광:'#a5bda1', 기타:'#bcc5b4' };
const defaults = () => ({ version:2, trip:{country:'FR',city:'파리',depart:'2026-11-10',return:'2026-11-17',budget:3000000,cash:80,card:'travel',account:true}, receipts:[{id:'demo-receipt',store:'파리 백화점 · 예시',date:'2026-11-12',amount:420,eligible:true,docs:true,instant:true,city:false,method:'travel',country:'FR'}], expenses:[['파리의 작은 비스트로',48,'음식'],['공항에서 숙소까지',25,'교통'],['마레 지구 기념품',85,'쇼핑'],['센 강 근처의 숙소',240,'숙박'],['미술관 관람',22,'관광']].map(([name,amount,category],i)=>({id:'demo-expense-'+i,name,amount,category,date:'2026-11-11',country:'FR',method:i===0?'cash':'travel',type:'purchase',rate:1580,cost:T.paymentCost(amount,i===0?'cash':'travel',1580),fee:T.paymentCost(amount,i===0?'cash':'travel',1580)-Math.round(amount*1580),expectedRefund:0,actualRefund:null})), selected:'demo-receipt', choices:{}, bves:{}, confirmations:{}, taxToday:null, board:null, exitAirport:'파리 샤를드골 (CDG)', exitCountry:'FR' });
let state = defaults(), storageWarning = false;
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem('travelback-finance-v2'));
    if (saved?.version === 2 && Array.isArray(saved.expenses) && Array.isArray(saved.receipts) && T.countries[saved.trip?.country]) {
      state = {...defaults(),...saved,trip:{...defaults().trip,...saved.trip}, choices:saved.choices || {}, bves:saved.bves || {}, confirmations:saved.confirmations || {}};
      state.expenses = saved.expenses.filter(e=>T.valid(e.amount)&&T.valid(e.cost)&&T.countries[e.country]&&typeof e.name==='string');
      state.receipts = saved.receipts.filter(r=>T.valid(r.amount)&&r.amount>0&&typeof r.store==='string'&&typeof r.date==='string');
      return;
    }
    const old = JSON.parse(localStorage.getItem('bonjour-finance-v1'));
    if (old && Array.isArray(old.expenses) && Array.isArray(old.receipts)) {
      state.trip = {...state.trip, depart:old.trip?.depart || state.trip.depart,return:old.trip?.return || state.trip.return,card:old.trip?.hasCard==='no'?'none':'travel',budget:T.valid(old.budget)?Math.round(old.budget*1580):3000000};
      state.expenses = old.expenses.filter(e=>T.valid(e.amount)&&typeof e.name==='string').map(e=>({id:id(),...e,category:e.category==='식비'?'음식':e.category,date:'2026-11-11',country:'FR',method:'travel',type:'purchase',rate:1580,cost:Math.round(e.amount*1580),fee:0,expectedRefund:0,actualRefund:null}));
      state.receipts = old.receipts.filter(r=>T.valid(r.amount)&&typeof r.store==='string').map(r=>({...r,id:id(),eligible:r.eligible==='yes',docs:false,instant:false,city:false,method:'travel',country:'FR'}));
      state.selected = state.receipts[0]?.id || null;
    }
  } catch { storageWarning = true; }
}
load();
function save() { try { localStorage.setItem('travelback-finance-v2',JSON.stringify(state)); } catch { if(!storageWarning) toast('브라우저 저장 공간을 사용할 수 없어 이번 화면에만 반영돼요.');storageWarning=true; } }
let toastTimer, currentTab='home', expenseFilter='all', currentCash={shortage:0,candidates:[]}, actualExpenseId=null;
function toast(message) { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600); }
function tab(name, scroll=true) {
  if(!['home','atm','tax','budget'].includes(name))name='home';currentTab=name;
  document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==name);
  document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);if(b.dataset.tab===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('page-title').textContent={home:'나의 여행',atm:'환전 · ATM',tax:'택스 리펀드',budget:'여행 가계부'}[name];
  history.replaceState(null,'','#'+name);chatContext();
  if(scroll)window.scrollTo({top:0,behavior:'instant'});
}
document.querySelectorAll('[data-tab],[data-go]').forEach(b=>b.onclick=()=>tab(b.dataset.tab||b.dataset.go));
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(h==='setup'){tab('home',false);$('setup').scrollIntoView({behavior:'smooth',block:'start'});}else tab(h);});
$('profile-button').onclick=()=>{tab('home',false);$('setup').scrollIntoView({behavior:'smooth',block:'start'});$('country').focus({preventScroll:true});};
function initForms() {
  const p=state.trip;['country','city','depart','return','card'].forEach(k=>$(k).value=p[k]);$('account').checked=p.account;$('trip-cash').value=p.cash;$('trip-budget').value=p.budget;$('cash').value=p.cash;
  $('purchase-date').value=p.depart;$('expense-date').value=p.depart;
  $('exit-airport').value=state.exitAirport;$('eu-exit').value=state.exitCountry;
}
function renderHome() {
  const p=state.trip,c=T.countries[p.country],days=Math.round((new Date(p.return)-new Date(p.depart))/86400000)+1;
  $('sidebar-flag').textContent=c.flag;$('sidebar-city').textContent=p.city+', '+c.english;$('sidebar-dates').textContent=p.depart.slice(5).replace('-','.')+' — '+p.return.slice(5).replace('-','.')+' · '+days+'일간의 여행';$('trip-airport').textContent=c.airport;
  $('hero-city').textContent=(p.city===c.city?c.hero:p.city)+'.';$('hero-currency').innerHTML=c.code+' <small>'+c.currency+'</small>';$('hero-rate').textContent=c.symbol+'1 = '+won(c.rate);
  document.querySelectorAll('.currency-code').forEach(el=>el.textContent=c.code);
  document.querySelector('.paris-art').style.visibility=p.country==='FR'?'visible':'hidden';
  const rows=[['€',c.currency+'로 결제해요','현지통화 '+c.code+'와 해외원화결제 조건을 비교하세요.'],['▣',p.card==='none'?'카드가 없다면 현금 준비부터':'보유 카드의 해외 사용을 확인해요',p.card==='none'?'환전용 원화 현금과 현지 결제 수단을 확인하세요.':T.methodNames[p.card]+' · 해외결제 설정, 수수료와 인출 한도 확인'],['↗',p.account?'외화계좌의 충전 조건을 확인해요':'외화 충전 서비스도 비교할 수 있어요',p.account?'지원 통화·충전 시간·인출 가능 여부를 확인하세요.':'서비스 개설·사용 가능 여부가 확인된 대안만 비교하세요.']];
  $('personal-guide').innerHTML=rows.map(([icon,title,body])=>`<div class="guide-item"><span>${icon}</span><div><b>${esc(title)}</b><p>${esc(body)}</p></div></div>`).join('');
  $('cash-prompt').value=`${p.city}에서 현금 ${p.country==='FR'?150:p.country==='JP'?20000:3000}${c.currency}가 필요해. ATM과 환전소를 비교해 줘.`;
  convertLocal();
}
$('country').onchange=()=>{$('city').value=T.countries[$('country').value].city;$('trip-cash').closest('label').querySelector('.currency-code').textContent=T.countries[$('country').value].code;};
['return','depart'].forEach(k=>$(k).oninput=()=>$('return').setCustomValidity(''));
$('setup').onsubmit=e=>{
  e.preventDefault();const city=$('city').value.trim();if(!city){$('setup-msg').textContent='도시를 입력해 주세요.';return;}
  if($('return').value<$('depart').value){$('return').setCustomValidity('귀국일은 출발일 이후로 선택해 주세요.');$('return').reportValidity();return;}
  const changed=state.trip.country!==$('country').value;
  state.trip={country:$('country').value,city,depart:$('depart').value,return:$('return').value,budget:+$('trip-budget').value,cash:+$('trip-cash').value,card:$('card').value,account:$('account').checked};
  if(changed){state.board=null;$('needed').value=state.trip.country==='JP'?20000:state.trip.country==='TH'?3000:150;$('balance').value=state.trip.country==='JP'?30000:state.trip.country==='TH'?5000:250;}
  $('cash').value=state.trip.cash;$('setup-msg').textContent='여행 정보와 맞춤 금융 가이드를 업데이트했어요. 기존 거래는 기록 당시 환율과 통화를 유지해요.';save();renderAll();toast('모든 화면에 여행 정보를 반영했어요.');
};
function convertLocal(){const c=T.countries[state.trip.country],v=+$('convert-local').value;if(T.valid(v))$('convert-krw').value=Math.round(v*c.rate);}
$('convert-local').oninput=convertLocal;$('convert-krw').oninput=()=>{const v=+$('convert-krw').value;if(T.valid(v))$('convert-local').value=T.round(v/T.countries[state.trip.country].rate);};
function renderCash(){
  const c=T.countries[state.trip.country];
  try{currentCash=T.cashCandidates({needed:+$('needed').value,cash:+$('cash').value,balance:+$('balance').value,rate:c.rate,operatorFee:c.atmFee,card:state.trip.card,account:state.trip.account,supported:$('topup-supported').checked,walk:+$('walk').value,offset:+$('location').value*3,board:state.board,cashKRW:+$('cash-krw').value});}catch(e){$('atm-results').innerHTML=`<p class="empty">${esc(e.message)}</p>`;return;}
  const {shortage,candidates}=currentCash,best=candidates[0],worst=candidates.at(-1),saving=best?worst.cost-best.cost:0;
  $('atm-summary').innerHTML=`<div class="cash-summary"><div><small>${shortage?'추가로 필요한 현금':'현금 준비 완료'}</small><strong>${foreign(shortage)}</strong><p>필요한 총 현금 − 이미 가진 현금</p></div><div class="summary-saving"><small>동일 수령액 비교</small><b>${saving?won(saving)+' 차이':shortage?'조건별 비교':'추가 확보 불필요'}</b><p>${saving?'현재 비교 가능한 후보의 최대 차이':'조건이 확인된 방법만 포함해요'}</p></div></div>`;
  const sorted=[...candidates].sort($('cash-sort').value==='walk'?(a,b)=>a.walk-b.walk:(a,b)=>a.cost-b.cost);
  $('atm-results').innerHTML=!shortage?'<div class="card empty">가진 현금으로 필요한 금액을 충당할 수 있어요.</div>':sorted.length?sorted.map(x=>`<div class="candidate ${x.id===best.id?'best':''}"><div class="candidate-top"><h3>${esc(x.name)} ${x.id===best.id?'<span class="badge">비교 후보 중 최저</span>':''}</h3><strong>${won(x.cost)}</strong></div><p>${esc(x.detail)}</p><div class="candidate-bottom"><span>도보 ${x.walk}분 · 비용 ${won(x.fee)} ${state.board&&x.id==='c'?'· 입력 '+esc(new Date(state.board.updatedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'})):''}</span><button type="button" data-candidate="${x.id}">위치 조건 보기 ↗</button></div></div>`).join(''):'<div class="card empty">현재 조건에 맞는 후보가 없어요.<br>도보 범위·카드·계좌 잔액을 확인해 주세요.</div>';
  $('cashless-text').textContent=state.trip.card==='none'?'보유 카드가 없어요. 카드 발급·현지 사용 가능 여부부터 확인해 주세요.':`현금 사용 예정액 중 ${foreign(shortage)}를 카드로 결제할 수 있다면, 시연 결제비용은 ${won(T.paymentCost(shortage,state.trip.card,c.rate))}이에요. 충전 잔액과 한도를 확인해 주세요.`;
  $('rate-source').textContent='출처: 내장 시연 데이터 · 1 '+c.code+' = '+won(c.rate)+' · 시연 버전 2026.10.26 · 실시간 조회 없음';
  document.querySelectorAll('[data-candidate]').forEach(b=>b.onclick=()=>showPlace(b.dataset.candidate));chatContext();
}
$('atm-form').onsubmit=e=>{e.preventDefault();renderCash();};$('cash-sort').onchange=renderCash;
$('cash-prompt-form').onsubmit=e=>{e.preventDefault();const result=T.parseCash($('cash-prompt').value,T.countries[state.trip.country]);if(result.error){$('cash-prompt-status').textContent=result.error;return;}$('needed').value=result.amount;$('cash-prompt-status').textContent=`필요한 총 현금 ${foreign(result.amount)}를 반영했어요. 보유 카드·현금·계좌 잔액은 아래 입력값을 사용합니다. 여러 금액이 있으면 직접 확인해 주세요.`;renderCash();};
function showPlace(place){const item=currentCash.candidates.find(x=>x.id===place);$('map-detail').textContent=item?`${item.name} · 도보 ${item.walk}분 · 수령 ${foreign(item.amount)} · 총비용 ${won(item.cost)}. ${item.detail}. 실제 주소와 길찾기는 연결되지 않았어요.`:'현재 조건에서 비교할 수 없는 가상 장소예요. 카드·잔액·지원 조건과 도보 시간을 확인해 주세요.';$('map-detail').scrollIntoView({behavior:'smooth',block:'nearest'});}
document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>showPlace(b.dataset.place));
let previewURLs={};
function previewFile(input,preview,label){const file=input.files[0];if(previewURLs[input.id])URL.revokeObjectURL(previewURLs[input.id]);$(preview).hidden=true;if(label)$(label).textContent=file?file.name:'영수증 이미지 또는 PDF 첨부';if(!file)return;if(file.size>10*1024*1024){toast('10MB 이하 파일을 선택해 주세요.');input.value='';if(label)$(label).textContent='영수증 이미지 또는 PDF 첨부';return;}if(/^image\/(jpeg|png|webp)$/.test(file.type)){previewURLs[input.id]=URL.createObjectURL(file);$(preview).src=previewURLs[input.id];$(preview).hidden=false;}else if(file.type!=='application/pdf'){toast('JPG, PNG, WebP 또는 PDF 파일을 선택해 주세요.');input.value='';} }
$('receipt-file').onchange=()=>previewFile($('receipt-file'),'receipt-preview','receipt-file-label');$('rate-file').onchange=()=>previewFile($('rate-file'),'rate-preview');
$('rate-upload-open').onclick=()=>{$('board-rate').value=state.board?.rate||T.round(T.countries[state.trip.country].rate*1.025);$('board-fee').value=state.board?.fee||0;$('board-confirm').checked=false;$('rate-dialog').showModal();};$('rate-dialog-close').onclick=()=>$('rate-dialog').close();
$('rate-form').onsubmit=e=>{e.preventDefault();state.board={rate:+$('board-rate').value,fee:+$('board-fee').value,country:state.trip.country,updatedAt:new Date().toISOString()};save();$('rate-dialog').close();renderCash();toast('직접 확인한 조건을 환전소 C에 반영했어요.');};
// 3페이지: 묶음 · 알림 · 기한 · 상태 · 보여 줄 조합은 서버(/api/refunds/tracker)가 계산하고 화면은 결과만 그린다 (R26~R28, R32, R52, R53)
let tracker=[],trackerError='',trackerSeq=0,bveFormKey=null;
const statusTone={COMPLETED:'done',DELAYED:'warn',EXPIRED:'warn',WAITING:'',CUSTOMS_NEEDED:'',DOCS_MISSING:'peach',NOT_APPLICABLE:'neutral'};
const optionNames={'airport-card':'공항 · 카드 환급','airport-cash':'공항 · 현금 환급',store:'매장 즉시환급',city:'시내 · 카드 환급'};
const errorText={INVALID_VAT:'VAT 번호는 FR + 영숫자 2자 + 숫자 9자예요. 모르면 비워 두세요.',INVALID_BVE:'환급사업자(1~40자)와 수령 방식을 확인해 주세요.',INVALID_BVE_DATE:'발행일은 묶음의 첫 구매일 이후여야 해요.',INVALID_REFUND_AMOUNT:'환급 예정액은 €0.01 이상, 합계에 포함된 VAT(합계 × 20 ÷ 120) 이하여야 해요.',INVALID_CONFIRM_DATE:'세관 확인일은 서류 발행일 이후, 상태 기준일 이전이어야 해요. 기준일을 확인해 주세요.',INVALID_AMOUNT:'금액은 €0.01~1,000,000 사이로 입력해 주세요.'};
const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const taxToday=()=>state.taxToday||todayISO();
const period=g=>g.startDate===g.endDate?g.startDate:g.startDate+' ~ '+g.endDate.slice(5);
async function postJSON(url,body){
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json().catch(()=>null);
  if(!res.ok){const code=data?.errors?.[0]?.code;throw new Error(errorText[code]||data?.errors?.[0]?.message||'요청을 처리하지 못했어요.');}
  return data;
}
async function refreshTax(){
  const seq=++trackerSeq,received=state.expenses.filter(e=>e.receiptGroup&&e.actualRefund!=null&&e.refundChoice!=='store').map(e=>e.receiptGroup);
  try{
    const data=await postJSON('/api/refunds/tracker',{receipts:state.receipts.map(r=>({id:r.id,store:r.store,date:r.date,amount:r.amount,method:r.method,vatNumber:r.vatNumber||'',eligible:r.eligible,instant:r.instant,city:r.city})),bves:state.bves,confirmations:state.confirmations,received,today:taxToday()});
    if(seq!==trackerSeq)return;tracker=data.map(g=>({...g,date:g.startDate,amount:Number(g.amount),docs:true,country:'FR'}));trackerError='';
  }catch(e){if(seq!==trackerSeq)return;tracker=[];trackerError=e.message;}
  drawTax();
}
function groups(){return tracker;}
function activeGroup(){return tracker.find(g=>g.ids.includes(state.selected))||tracker[0]||null;}
// BVE가 있으면 선택은 서류의 수령 방식으로 고정된다 (R33)
function chosenOption(group){if(!group)return undefined;const fixed=group.bveMethod,options=T.refundOptions(fixed?{...group,instant:true,city:true}:group);return options.find(o=>o.id===(fixed||state.choices[group.key]))||options[0];}
function renderTax(){drawTax();refreshTax();}
function drawTax(){
  const all=groups(),g=activeGroup(),options=g?T.refundOptions(g):[],selected=chosenOption(g),rows=g?.rows||[],best=rows[0],bve=g&&state.bves[g.key];
  const notFrance=state.trip.country!=='FR';$('tax-country-note').textContent=notFrance?'현재 여행 국가의 환급 규칙은 준비 중이에요. 아래는 기존 프랑스 영수증의 별도 시연이며 신규 등록은 프랑스로 설정 후 이용해 주세요.':'';$('tax-form').querySelector('button.primary').disabled=notFrance;
  $('tax-today').value=taxToday();$('receipt-count').textContent=state.receipts.length;$('active-receipt').textContent=g?g.store+' · '+period(g):'영수증을 등록해 주세요';
  const waiting=state.trip.return<=taxToday()&&all.some(x=>x.status==='CUSTOMS_NEEDED');$('tracker-banner').hidden=!waiting;$('tracker-banner').textContent=waiting?'PABLO 초록 화면을 봤나요? 세관 확인이 필요한 구매가 있어요. "선택한 구매의 환급 진행"에서 세관 확인을 표시해 주세요.':'';
  $('receipts').innerHTML=trackerError?`<div class="empty">${esc(trackerError)}</div>`:all.length?all.map(item=>`<div class="receipt-row ${item.key===g?.key?'selected':''}"><button class="receipt-select" data-select="${esc(item.ids[0])}" aria-pressed="${item.key===g?.key}"><div><b>${esc(item.store)}</b><strong>${foreign(item.amount,'FR')}</strong></div><p>${esc(period(item))} · ${item.ids.length}개 영수증 합산${item.vatNumber?' · VAT '+esc(item.vatNumber):''}</p><span class="badge ${statusTone[item.status]}">${esc(item.statusLabel)}</span></button><button class="receipt-delete" data-receipt-delete="${esc(item.ids[0])}" aria-label="${esc(item.store)} 영수증 묶음 삭제">×</button></div>`).join(''):state.receipts.length?'<div class="empty">환급 상태를 불러오는 중이에요…</div>':'<div class="empty"><span class="empty-icon">▤</span>아직 등록한 영수증이 없어요.<br>예시를 불러오거나 거래 정보를 입력해 보세요.</div>';
  $('refund-overview').innerHTML=best?`<div class="eyebrow">MAKE YOUR SHOPPING GO FURTHER</div><h3>결제부터 환급까지,<br>놓치지 않고 비교했어요.</h3><div class="highlight-figures"><div><p>예상 환급액 · ${esc(best.label)}</p><strong>${won(best.refundKRW)}</strong></div><div><p>${bve?'서류 기준 실지출액':'이 결제 수단의 최소 실지출액'}</p><strong>${won(best.net)}</strong></div></div><small>${T.methodNames[best.method]} + ${optionNames[best.id]} / 프랑스 시연 환율 기준</small>`:'<div class="eyebrow">READY FOR A LITTLE BACK?</div><h3>영수증과 환급서류를<br>함께 준비해 주세요.</h3><p>금액만으로 환급을 보장하지 않아요.<br>자격·금액 조건이 맞는 구매만 비교합니다.</p>';
  drawStatus(g);drawBveForm(g);
  if(!g||(!options.length&&!bve)){$('refund-options').innerHTML='<div class="card empty" style="grid-column:1/-1">'+(!g?'영수증을 등록하면 환급 장소와 수령 방식을 비교할 수 있어요.':g.reasons?.length?esc(g.reasons.join(' · '))+'이 필요해요. 같은 매장 3일 합계가 €100을 넘는지, 자격 요건을 확인해 주세요.':'환급 조건을 확인해 주세요.')+'</div>';}else{
    const places=[{key:'airport-card',label:'공항 · 카드 환급'},{key:'store',label:'매장 즉시환급'},{key:'airport-cash',label:'공항 · 현금 환급'},...(g.city?[{key:'city',label:'시내 · 카드 환급'}]:[])];
    $('refund-options').innerHTML=places.map(({key,label})=>{const o=options.find(x=>x.id===key),mine=g.bveMethod===key;if(mine)return `<div class="refund-option active"><span class="badge done">확인됨 · 서류 등록</span><h3>${label}</h3><strong>${foreign(bve.amount,'FR')}</strong><p>${esc(bve.operator)}${bve.number?' · '+esc(bve.number):''}</p><small>서류 금액으로 계산 중이에요.</small></div>`;return o?`<button class="refund-option ${!g.bveMethod&&selected?.id===o.id?'active':''}" data-refund="${o.id}" aria-pressed="${!g.bveMethod&&selected?.id===o.id}" ${g.bveMethod?'disabled':''}><span class="badge neutral">추정</span><h3>${label}</h3><strong>${foreign(o.refund,'FR')}</strong><p>${esc(o.timing)}</p><small>${esc(o.time)}</small></button>`:`<div class="refund-option disabled"><span class="badge neutral">확인 필요</span><h3>${label}</h3><strong>—</strong><p>매장의 지원 여부가 확인되지 않아<br>비교에서 제외했어요.</p><small>등록 시 지원 조건을 확인해 주세요.</small></div>`;}).join('');
  }
  $('optimization-summary').innerHTML=best?`<div class="optimization-banner"><p><span class="badge">${esc(best.label)}</span><br><b>${T.methodNames[best.method]} + ${optionNames[best.id]}</b><br>${bve?'등록한 서류 금액으로 확정한 실지출액이에요.':rows.length>1?'이미 결제한 수단 기준으로 가장 비용이 큰 방법보다 '+won(rows.at(-1).net-best.net)+' 낮아요. '+(g.rowsNote||''):''}</p><strong>${won(best.net)}</strong></div>`:'';
  $('optimization-table').innerHTML=rows.length?rows.map((x,i)=>`<tr class="${i===0?'best-row':''}"><td><b>${T.methodNames[x.method]}</b>${i===0?' <span class="badge">최저</span>':''}</td><td>${optionNames[x.id]}</td><td>${won(x.gross)}</td><td>−${won(x.refundKRW)}</td><td><b>${won(x.net)}</b></td><td><span class="badge ${x.label==='확인됨'?'done':'neutral'}">${esc(x.label)}</span></td></tr>`).join(''):'<tr><td colspan="6" class="empty">확인 가능한 영수증의 환급 조건이 필요해요.</td></tr>';
  $('refund-assumptions').textContent='프랑스 전용: 기준환율 €1 = 1,580원. 트래블카드 결제 비용 0%, 일반 카드 1.3%, 현금 환전 가산율 2%. 매장 즉시환급 10%(구매 시 차감), 공항 카드 12%(환급환율은 기준의 99.5%), 공항 현금 10.5% − €3(환급환율 98%), 시내 카드 11% − €2(99.5%). 환급률은 VAT 세율이 아닌 수수료 차감 후 시연 비율(추정)이며, 서류를 등록하면 서류 금액(확인됨)을 씁니다. 등록한 영수증은 이미 결제한 수단의 행만 보여 줘요. 실제 지원·소요기간을 보장하지 않아요.';
  $('link-receipt').disabled=!g||!selected||g.method==='mixed';
  if(g?.method==='mixed')$('receipt-message').textContent='서로 다른 결제 수단이 섞인 묶음은 가계부 자동 연결을 지원하지 않아요. 거래별로 직접 기록해 주세요.';
  document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.select;save();drawTax();chatContext();});
  document.querySelectorAll('[data-refund]').forEach(b=>b.onclick=()=>{state.choices[g.key]=b.dataset.refund;save();drawTax();chatContext();});
  document.querySelectorAll('[data-receipt-delete]').forEach(b=>b.onclick=()=>{const target=all.find(x=>x.ids.includes(b.dataset.receiptDelete));state.receipts=state.receipts.filter(r=>!target.ids.includes(r.id));if(target.ids.includes(state.selected))state.selected=null;delete state.choices[target.key];delete state.bves[target.key];delete state.confirmations[target.key];save();renderTax();renderBudget();chatContext();toast('영수증을 삭제했어요. 이미 연결한 가계부 거래는 유지돼요.');});
  renderRoute();chatContext();
}
// 상태 · 기한 · 알림과 세관 확인 표시 (R27, R53, R55). 세관 · 사업자 처리는 사용자가 표시한 날짜로만 판정한다
function drawStatus(g){
  $('status-tag').textContent=g?g.store+' · '+period(g):'';
  if(!g){$('refund-status').innerHTML='<p class="empty">영수증을 등록하면 환급 진행 상태를 보여 드려요.</p>';return;}
  const bve=state.bves[g.key],confirmed=state.confirmations[g.key],dday=d=>{const n=Math.round((new Date(d)-new Date(taxToday()))/86400000);return n>=0?'D-'+n:'D+'+(-n);};
  const notes=[g.alert&&`<p class="status-alert">📄 ${esc(g.alert)}</p>`,g.multiDayNote&&`<p class="subtle-note">${esc(g.multiDayNote)}</p>`,g.statusNote&&`<p class="status-note">${esc(g.statusNote)}</p>`,g.penaltyKRW?`<p class="status-note">청구 예상액 ${won(g.penaltyKRW)}</p>`:''].filter(Boolean).join('');
  const customs=!bve?'':confirmed?`<div class="confirm-row"><span>세관 확인 ${esc(confirmed)}</span><button class="text-button" type="button" id="confirm-cancel">확인 취소</button></div>`:`<div class="confirm-box"><b>세관 확인했어요</b><div class="two"><label>확인일<input id="confirm-date" type="date" value="${taxToday()}"></label><label>키오스크 화면<select id="confirm-kind"><option value="green">초록 화면 (완료)</option><option value="red">빨간 화면 · 창구 도장</option></select></label></div><label class="check-row" id="confirm-mail-row" hidden><input id="confirm-mail" type="checkbox"><span>창구 도장을 받고 서류를 사업자 봉투로 우편함에 넣었어요</span></label><button class="primary" type="button" id="confirm-save">세관 확인 표시</button><p id="confirm-message" class="form-message" role="status"></p></div>`;
  $('refund-status').innerHTML=`<div class="card-head"><div><h3>환급 상태</h3><p>세관 · 사업자 처리는 자동 확인되지 않아요. 표시한 날짜로 판정해요.</p></div><span class="status-badge ${statusTone[g.status]}">${esc(g.statusLabel)}</span></div>${notes}<div class="deadline-row"><span>세관 확인 기한 <b>${esc(g.customsDeadline)}</b> ${dday(g.customsDeadline)}</span>${g.effectiveDeadline!==g.customsDeadline?`<span>실제 기한 <b>${esc(g.effectiveDeadline)}</b> ${dday(g.effectiveDeadline)}</span>`:''}</div>${bve?`<p class="body-copy">서류: ${esc(bve.operator)} · ${optionNames[bve.method]} · ${foreign(bve.amount,'FR')} → <b>${won(g.bveKRW)}</b> <span class="badge done">확인됨</span></p>`:'<p class="body-copy">매장에서 받은 환급 서류를 오른쪽에 등록하면 서류 금액으로 계산하고 세관 확인을 표시할 수 있어요.</p>'}${customs}`;
  if(confirmed)$('confirm-cancel').onclick=()=>{delete state.confirmations[g.key];save();renderTax();};
  else if(bve){
    $('confirm-kind').onchange=()=>{$('confirm-mail-row').hidden=$('confirm-kind').value!=='red';};
    $('confirm-save').onclick=()=>{const date=$('confirm-date').value;if($('confirm-kind').value==='red'&&!$('confirm-mail').checked){$('confirm-message').textContent='빨간 화면이면 창구 도장 후 우편함 투함까지 해야 확인으로 표시돼요. 아래 체크리스트를 확인해 주세요.';return;}if(!date||date<bve.issuedOn||date>taxToday()){$('confirm-message').textContent=errorText.INVALID_CONFIRM_DATE;return;}state.confirmations[g.key]=date;save();renderTax();toast('세관 확인을 표시했어요. 입금 여부는 가계부에서 실제 수령액으로 기록해 주세요.');};
  }
}
// 환급 서류(BVE) 등록 (R52). 묶음이 바뀔 때만 입력칸을 다시 채운다
function drawBveForm(g){
  const usable=g&&(g.options?.length||state.bves[g.key]);[...$('bve-form').elements].forEach(el=>el.disabled=!usable);
  if(!g||g.key===bveFormKey)return;bveFormKey=g.key;const bve=state.bves[g.key],known=['Global Blue','Planet','매장 직접'];
  $('bve-operator').value=bve?(known.includes(bve.operator)?bve.operator:''):'Global Blue';$('bve-operator-other').value=bve&&!known.includes(bve.operator)?bve.operator:'';
  $('bve-number').value=bve?.number||'';$('bve-issued').value=bve?.issuedOn||g.startDate;$('bve-issued').min=g.startDate;$('bve-method').value=bve?.method||chosenOption(g)?.id||'airport-card';
  $('bve-amount').value=bve?.amount??'';$('bve-pablo').checked=bve?bve.pablo!==false:true;$('bve-message').textContent=bve?'등록한 서류예요. 고쳐서 다시 등록하면 덮어써요.':'';
}
$('bve-form').onsubmit=async e=>{
  e.preventDefault();const g=activeGroup();if(!g)return;
  const operator=$('bve-operator').value||$('bve-operator-other').value.trim();
  const input={operator,number:$('bve-number').value.trim()||null,issuedOn:$('bve-issued').value,pablo:$('bve-pablo').checked,method:$('bve-method').value,amount:+$('bve-amount').value};
  try{const res=await postJSON('/api/refunds/bve',{group:{startDate:g.startDate,amount:g.amount,method:g.method},bve:input});state.bves[g.key]=res.bve;save();bveFormKey=null;$('bve-message').textContent=`서류를 등록했어요. 예정 환급 ${won(res.expectedKRW)} (확인됨)`;renderTax();toast('환급 서류 금액으로 다시 계산했어요.');}
  catch(err){$('bve-message').textContent=err.message;}
};
$('tax-today').onchange=()=>{state.taxToday=$('tax-today').value||null;save();renderTax();};
$('load-receipt-demo').onclick=()=>{$('store').value='파리 백화점 · 예시';$('purchase-amount').value=420;$('purchase-date').value=state.trip.depart;$('vat-number').value='';$('tax-eligible').checked=true;$('instant-supported').checked=true;$('city-supported').checked=false;$('receipt-message').textContent='예시 데이터를 불러왔어요. 실제 영수증을 분석한 결과가 아닙니다.';};
$('tax-form').onsubmit=e=>{
  e.preventDefault();if(state.trip.country!=='FR')return;const store=$('store').value.trim();if(!store){$('receipt-message').textContent='매장명을 입력해 주세요.';return;}
  const vat=$('vat-number').value.replace(/\s+/g,'').toUpperCase();if(vat&&!/^FR[0-9A-Z]{2}[0-9]{9}$/.test(vat)){$('receipt-message').textContent=errorText.INVALID_VAT;return;}
  const r={id:id(),store,date:$('purchase-date').value,amount:+$('purchase-amount').value,method:$('purchase-method').value,vatNumber:vat||null,eligible:$('tax-eligible').checked,instant:$('instant-supported').checked,city:$('city-supported').checked,country:'FR'};
  if(state.receipts.some(x=>x.store.normalize('NFC').trim().toLowerCase()===store.normalize('NFC').toLowerCase()&&x.date===r.date&&x.amount===r.amount)){ $('receipt-message').textContent='같은 매장·날짜·금액의 영수증이 있어요. 중복 여부를 확인해 주세요.';return; }
  state.receipts.push(r);state.selected=r.id;save();resetReceiptForm();$('receipt-message').textContent='입력한 거래를 등록했어요. 같은 매장(VAT 번호)·3일 안의 영수증은 합산됩니다.';renderTax();toast('영수증과 환급 비교를 업데이트했어요.');
};
// 등록 후 다음 영수증을 바로 넣을 수 있게 입력칸 · 첨부 · 미리보기를 비운다. 같은 사진을 다시 골라도 인식이 다시 돈다
function resetReceiptForm(){$('tax-form').reset();$('store').value='';$('purchase-amount').value='';$('purchase-date').value='';previewFile($('receipt-file'),'receipt-preview','receipt-file-label');}
// 출국 체크리스트 (R36): 짐 부치기 전 키오스크 → 초록 / 빨간 화면 분기 → 보안검색
function renderRoute(){
  const g=activeGroup(),selected=chosenOption(g),early=['store','city'].includes(selected?.id),bve=g&&state.bves[g.key];
  $('exit-guide').textContent=state.exitCountry==='FR'?`${state.exitAirport||'출국 공항'}에서 EU를 최종 출국한다면, 체크인 · 짐 부치기 전에 PABLO 키오스크부터 들르세요. 세부 위치는 공식 공항·세관 안내로 확인해 주세요.`:'다른 EU 국가에서 최종 출국한다면 그 국가의 세관 도장이 필요하고 서류 출력본을 챙겨야 해요. 프랑스 공항에서 자동 완료된다고 가정하지 마세요.';
  const dday=!g?'기한은 영수증을 등록하면 표시돼요':early&&!bve?'반송 기한(환급일 + 21일)과 세관 기한 '+g.customsDeadline+' 중 이른 날 D-day':(early?'실제 기한 '+g.effectiveDeadline:'세관 확인 기한 '+g.customsDeadline)+' D-day';
  const steps=[['매장에서','여권 제시 · 택스리펀 서류(PABLO 바코드) 요청 · 수령 방식 확인'+(early?' · 선환급이면 카드 보증(본인 명의, 6개월 이상 유효)':'')],['출국 전','물건은 사용하지 않고 포장 그대로 · 서류와 여권 준비 · '+dday],['최종 EU 출국 시',state.exitCountry==='FR'?'① 체크인 · 짐 부치기 전 PABLO 키오스크에서 바코드 스캔 ② 초록 화면이면 완료(화면 캡처 권장) ③ 빨간 화면 · 고장 · 바코드 없음이면 세관 창구 도장 → 서류를 사업자 봉투로 우편함 투함 ④ 그다음 보안검색(통과 후 되돌아올 수 없음)':'그 나라 세관 도장 필요 · 서류 출력본 필요 · 프랑스 자동 완료 아님 · 판매자가 6개월 안에 전표를 받아야 환급']];
  $('refund-checklist').innerHTML=steps.map(([title,body],i)=>`<div class="route-step"><span>${i+1}</span><div><b>${title}</b><p>${esc(body)}</p></div></div>`).join('');
}
['exit-airport','eu-exit'].forEach(k=>$(k).onchange=()=>{state.exitAirport=$('exit-airport').value.trim();state.exitCountry=$('eu-exit').value;save();renderRoute();});
// 가계부 연결 (R34): BVE가 있으면 서류 예정 원화를 환급 예정 · 즉시 차감으로 쓴다
$('link-receipt').onclick=()=>{
  const g=activeGroup(),choice=chosenOption(g);if(!g||!choice||g.method==='mixed')return;
  const existing=state.expenses.find(e=>e.receiptGroup===g.key||e.receiptIds?.some(r=>g.ids.includes(r)));
  if(existing){toast('이미 연결한 구매예요. 중복 거래를 추가하지 않았어요.');return;}
  const bve=state.bves[g.key],base=bve?{...g,instant:true,city:true}:g,all=T.combinations(base,1580),refundEuro=bve?Number(bve.amount):choice.refund;
  const same=state.expenses.find(e=>e.type==='purchase'&&e.country==='FR'&&e.name.normalize('NFC').trim().toLowerCase()===g.store.normalize('NFC').trim().toLowerCase()&&e.date===g.date&&e.amount===g.amount);
  let row=all.find(x=>x.method===g.method&&x.id===choice.id);if(!row)return;
  if(bve&&g.bveKRW!=null)row={...row,refundKRW:g.bveKRW,net:row.gross-g.bveKRW};
  const isInstant=row.id==='store';
  const data={amount:isInstant?T.round(g.amount-refundEuro):g.amount,originalAmount:g.amount,receiptGroup:g.key,receiptIds:[...g.ids],expectedRefund:isInstant?0:row.refundKRW,refundPlace:row.place,refundReceive:row.receive,actualRefund:isInstant?0:null,instantDiscount:isInstant?row.refundKRW:0,refundChoice:row.id,refundBasis:bve?'확인됨':'추정',comparison:{chosen:row.net,best:all[0].net,store:all.find(x=>x.method===g.method&&x.id==='store')?.net,airport:all.find(x=>x.method===g.method&&x.id==='airport-card')?.net}};
  if(same)Object.assign(same,data,isInstant?{cost:row.net,fee:Math.max(0,row.net-Math.round((g.amount-refundEuro)*1580))}:{});else state.expenses.push({id:id(),name:g.store,date:g.date,amount:g.amount,country:'FR',rate:1580,method:g.method,type:'purchase',category:'쇼핑',cost:isInstant?row.net:row.gross,fee:isInstant?Math.max(0,row.net-Math.round((g.amount-refundEuro)*1580)):row.gross-Math.round(g.amount*1580),...data});
  save();renderBudget();toast(same?'일치하는 수동 거래에 환급 정보를 연결했어요.':bve?'서류 금액(확인됨)으로 가계부에 연결했어요.':'영수증과 환급 예정액을 가계부에 연결했어요.');
};
function renderBudget(){
  const s=T.ledgerSummary(state.expenses),budget=state.trip.budget,pct=budget?s.gross/budget*100:0;
  const metrics=[['현재 실지출액',s.net,'기록된 비용 − 실제 수령한 환급'],['환급 예정액',s.pending,'미수령 예정액 · 확정 지출과 구분'],['실제 환급 수령',s.actual,'직접 확인해 기록한 수령 금액'],['금융 비용',s.fees,'환전·결제·인출 시연 비용 합계']];
  $('budget-metrics').innerHTML=metrics.map(([title,amount,note])=>`<div class="metric"><span>${title}</span><strong>${won(amount)}</strong><small>${note}</small></div>`).join('');
  const purchaseTotal=s.purchases.reduce((sum,e)=>sum+e.cost,0);$('chart-total').textContent=purchaseTotal.toLocaleString('ko-KR');let cursor=0;const gradient=[],labels=[];
  $('legend').innerHTML=Object.entries(colors).map(([cat,color])=>{const amount=s.purchases.filter(e=>e.category===cat).reduce((sum,e)=>sum+e.cost,0),part=purchaseTotal?amount/purchaseTotal*100:0;gradient.push(`${color} ${cursor}% ${cursor+part}%`);cursor+=part;labels.push(`${cat} ${part.toFixed(1)}%`);return `<div class="legend-row"><i style="background:${color}"></i>${cat}<b>${part.toFixed(0)}%</b></div>`;}).join('');
  $('donut').style.background=purchaseTotal?`conic-gradient(${gradient.join(',')})`:'#e9eee1';$('donut').setAttribute('aria-label','카테고리별 지출: '+labels.join(', '));
  $('budget-percent').textContent=pct.toFixed(1)+'%';$('budget-progress').style.width=Math.min(100,pct)+'%';$('budget-progress').style.background=pct>100?'#c99064':'#91ac73';$('budget-note').textContent=(s.gross>budget?'예산 초과 '+won(s.gross-budget):'남은 예산 '+won(budget-s.gross))+' · 전체 예산 '+won(budget);
  const cashTotal=s.purchases.filter(e=>e.method==='cash').reduce((sum,e)=>sum+e.cost,0);$('payment-split').innerHTML=`<span>현금 ${purchaseTotal?(cashTotal/purchaseTotal*100).toFixed(0):0}%</span><span>카드 ${purchaseTotal?((purchaseTotal-cashTotal)/purchaseTotal*100).toFixed(0):0}%</span>`;
  const refunds=state.expenses.filter(e=>e.refundChoice);
  $('refund-tracking').innerHTML=refunds.length?refunds.map(e=>`<div class="refund-track-row"><div><b>${esc(e.name)}</b><p>${esc(e.refundPlace)} · ${esc(e.refundReceive)}<br>${e.instantDiscount?'차감된 구매금액을 지출에 반영했어요.':'예정 '+won(e.expectedRefund)+(e.actualRefund!=null?' · 실제 차이 '+won(e.actualRefund-e.expectedRefund):'')}</p></div><div class="track-money"><strong>${e.instantDiscount?won(e.instantDiscount):e.actualRefund!=null?won(e.actualRefund):won(e.expectedRefund)}</strong><span class="badge ${e.actualRefund!=null?'':'peach'}">${e.instantDiscount?'매장 차감 반영':e.actualRefund!=null?'수령 기록 완료':'환급 예정'}</span> <button ${e.instantDiscount?'hidden':''} data-actual="${esc(e.id)}">${e.actualRefund!=null?'수령액 수정':'수령액 기록'} ↗</button></div></div>`).join(''):'<p class="empty">택스 리펀드에서 영수증을 연결하면<br>예정액과 실제 환급 내역을 함께 볼 수 있어요.</p>';
  const filtered=state.expenses.filter(e=>expenseFilter==='all'||(expenseFilter==='purchase'?e.type==='purchase':e.type!=='purchase'));
  $('expenses').innerHTML=filtered.length?[...filtered].reverse().map(e=>`<tr><td><b>${esc(e.name)}</b><small>${esc(e.date)} · ${e.receiptGroup?'영수증 연결':'직접 입력 / 시연 예시'}${e.type!=='purchase'?' · 자금 이동':''}</small></td><td>${esc(e.type==='purchase'?e.category:e.type==='atm'?'ATM 인출':'외화 충전')}</td><td>${T.methodNames[e.method]||'기타'}</td><td>${foreign(e.amount,e.country)}</td><td><b>${won(e.type==='purchase'?e.cost:e.fee)}</b>${e.type!=='purchase'?'<small>비용만 지출에 반영</small>':''}</td><td><button class="delete" data-expense-delete="${esc(e.id)}" aria-label="${esc(e.name)} 거래 삭제">×</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">표시할 거래가 없어요.</td></tr>';
  const travelSavings=s.purchases.filter(e=>e.method==='travel').reduce((sum,e)=>sum+Math.max(0,T.paymentCost(e.amount,'cash',e.rate)-e.cost),0),topCategory=Object.keys(colors).sort((a,b)=>s.purchases.filter(e=>e.category===b).reduce((sum,e)=>sum+e.cost,0)-s.purchases.filter(e=>e.category===a).reduce((sum,e)=>sum+e.cost,0))[0];
  $('ai-report').innerHTML=`<p>기록된 총비용은 <strong>${won(s.gross)}</strong>, 실제 환급 수령액을 반영한 지출은 <strong>${won(s.net)}</strong>이에요.${s.pending?' 예정된 환급까지 모두 수령한다면 '+won(s.projected)+'으로 예상돼요.':''}</p><p>${s.purchases.length?'가장 많이 사용한 카테고리는 '+topCategory+'이에요. ':''}외화카드로 결제한 기록은 시연 현금 환전 방식보다 <strong>${won(travelSavings)}</strong> 낮게 계산됐어요.</p>${refunds.map(e=>e.comparison?'<p>'+esc(e.name)+'은 '+esc(e.refundPlace)+' · '+esc(e.refundReceive)+' 방식으로 연결했어요.'+(e.comparison.store!=null&&e.comparison.airport!=null?' 같은 결제 수단에서 매장 즉시환급보다 공항 카드 환급의 실지출액이 <strong>'+won(e.comparison.store-e.comparison.airport)+'</strong> 낮게 계산됐어요.':' 확인된 환급 방식만 비교했어요.')+'</p>':'').join('')}<p>다음 여행에는 현금 사용처를 먼저 확인하고, 필요한 금액만 확보하는 방법을 비교해 보세요.</p><small>시연 조건을 사용한 계산 리포트입니다. 실제 상품 약관·환급 환율·운영사 비용이 확인되지 않은 대안의 절감액은 확정하지 않아요. 충전·인출 원금은 소비 합계에서 제외합니다.</small>`;
  document.querySelectorAll('[data-expense-delete]').forEach(b=>b.onclick=()=>{state.expenses=state.expenses.filter(e=>e.id!==b.dataset.expenseDelete);save();renderBudget();toast('거래를 삭제했어요. 영수증 원본 기록은 유지돼요.');});
  document.querySelectorAll('[data-actual]').forEach(b=>b.onclick=()=>{actualExpenseId=b.dataset.actual;const e=state.expenses.find(x=>x.id===actualExpenseId);$('actual-refund').value=e.actualRefund??e.expectedRefund;$('refund-dialog').showModal();});
}
$('expense-name').oninput=()=>{const q=$('expense-name').value;let cat='기타';if(/카페|커피|식당|음식|비스트로|크루아상/.test(q))cat='음식';else if(/호텔|숙소|숙박/.test(q))cat='숙박';else if(/택시|지하철|버스|교통|공항/.test(q))cat='교통';else if(/쇼핑|백화점|기념품|가방/.test(q))cat='쇼핑';else if(/미술관|박물관|입장|관광/.test(q))cat='관광';$('category').value=cat;};
$('expense-form').onsubmit=e=>{
  e.preventDefault();const name=$('expense-name').value.trim();if(!name)return;const amount=+$('expense-amount').value,type=$('expense-type').value,method=$('expense-method').value,date=$('expense-date').value,c=T.countries[state.trip.country];
  if(state.expenses.some(x=>x.name.normalize('NFC').toLowerCase()===name.normalize('NFC').toLowerCase()&&x.amount===amount&&x.date===date&&x.country===state.trip.country&&x.type===type)){ $('expense-message').textContent='같은 항목·날짜·금액의 거래가 있어요. 중복 여부를 확인해 주세요.';return; }
  const cost=type==='purchase'?T.paymentCost(amount,method,c.rate):Math.round(amount*c.rate);const fee=type==='purchase'?cost-Math.round(amount*c.rate):type==='atm'?Math.round(c.atmFee*c.rate):Math.round(amount*c.rate*.002);
  state.expenses.push({id:id(),name,amount,type,method,date,category:$('category').value,country:state.trip.country,rate:c.rate,cost,fee,expectedRefund:0,actualRefund:null});save();renderBudget();$('expense-name').value='';$('expense-amount').value='';$('expense-message').textContent=type==='purchase'?'지출을 기록했어요.':'자금 이동으로 기록했어요. 원금은 소비 합계에서 제외하고 시연 비용만 반영해요.';toast('여행 기록을 저장했어요.');
};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{expenseFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderBudget();});
$('refund-dialog-close').onclick=()=>$('refund-dialog').close();$('actual-refund-form').onsubmit=e=>{e.preventDefault();const item=state.expenses.find(x=>x.id===actualExpenseId);if(!item)return;item.actualRefund=+$('actual-refund').value;save();$('refund-dialog').close();renderBudget();toast('실제 환급 수령액을 리포트에 반영했어요.');};
$('export-report').onclick=()=>{const s=T.ledgerSummary(state.expenses);const report=['TravelBack AI — 여행 금융 리포트 (데모)',state.trip.city+' · '+state.trip.depart+' ~ '+state.trip.return,'','총 기록 비용: '+won(s.gross),'실제 환급: '+won(s.actual),'환급 예정: '+won(s.pending),'현재 실지출액: '+won(s.net),'예정 환급 반영 예상액: '+won(s.projected),'금융 비용: '+won(s.fees),'',...state.expenses.map(e=>`${e.date} | ${e.name} | ${e.type} | ${foreign(e.amount,e.country)} | ${won(e.type==='purchase'?e.cost:e.fee)}`),'','모든 환율·금융비용·환급률은 시연 가정입니다. 실제 금융 거래·상품 연동이 없으며, 충전·인출은 원금 제외·비용만 합산합니다.'].join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+report],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='TravelBack_여행금융리포트.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function chatContext(){const g=activeGroup();$('chat-context').textContent=`참조: ${state.trip.city} · ${T.countries[state.trip.country].code} · ${T.methodNames[state.trip.card]||'카드 없음'}${g?' / 선택 영수증 '+g.store+' '+foreign(g.amount,'FR'):''}`;}
function chatOpen(open){$('chat').hidden=!open;$('chat-toggle').setAttribute('aria-expanded',String(open));if(open){chatContext();$('chat-input').focus();}}$('chat-toggle').onclick=()=>chatOpen($('chat').hidden);$('chat-close').onclick=()=>chatOpen(false);
function answer(q){
  const g=activeGroup(),c=T.countries[state.trip.country],options=T.refundOptions(g),combos=T.combinations(g,1580);let result=`${state.trip.city} 여행의 결제, 환전, 영수증, 환급과 예산 질문을 도와드려요. 화면의 시연 조건을 바탕으로 설명합니다.`;
  if(/카드|결제|수수료/.test(q))result=`보유 수단은 ${T.methodNames[state.trip.card]||'카드 없음'}이에요. 현지통화 ${c.code} 결제와 해외원화결제(DCC)의 비용 조건을 확인하세요. 시연 계산은 트래블카드 0%, 일반 카드 1.3%지만 실제 상품 혜택이 아닙니다. 우리카드·우리은행 공식 채널에서 지원 통화, 한도, 해외 사용 조건을 확인해 주세요.`;
  if(/현금|ATM|atm|환전|인출/.test(q)){const best=currentCash.candidates[0];result=best?`현재 입력 조건에서 ${foreign(currentCash.shortage)}를 추가 확보할 때, ${best.name}의 시연 총비용이 ${won(best.cost)}으로 비교 가능한 후보 중 가장 낮아요. 현지 운영사 비용을 포함한 계산이며 실제 위치·영업 정보는 연결되지 않았어요. 카드·잔액·충전 지원 여부를 확인해 주세요.`:'현재 비교 조건에서 추가 현금이 필요하지 않거나 이용 가능한 후보가 없어요. 환전·ATM 화면의 금액, 보유 카드, 외화잔액과 도보 시간을 확인해 주세요.';}
  if(/환급|택스|영수증/.test(q)){if(!g)result='등록된 영수증이 없어요. 택스 리펀드에서 거래와 환급서류 발급 여부를 입력해 주세요.';else if(!options.length)result=`${g.store}의 ${foreign(g.amount,'FR')} 구매는 ${!g.docs?'환급서류 발급':!g.eligible?'거주·체류 등 자격':'동일 매장·같은 날의 구매금액'} 확인이 필요해요. 확인 전에는 환급액과 장소를 확정할 수 없어요.`;else{const airport=combos.find(x=>x.method==='travel'&&x.id==='airport-card'),store=combos.find(x=>x.method==='travel'&&x.id==='store');result=`선택한 영수증은 ${g.store}, ${g.date}, ${foreign(g.amount,'FR')} 구매예요. 시연 조건에서 공항 카드 환급 예상액은 ${won(airport.refundKRW)}입니다.${store?' 매장 즉시환급 대비 최종 지출액이 '+won(store.net-airport.net)+' 낮게 계산돼요.':' 매장 즉시환급은 지원 확인이 없어 비교에서 제외했어요.'} 공항 방식은 최종 EU 출국 시 세관 확인과 대기가 필요해요. 즉시환급도 사후 서류 확인 조건을 따라야 합니다. 실제 지원·수수료·카드 환급 가능 여부는 사업자와 카드사 확인이 필요해요.`;}}
  if(/우리카드|우리은행|외화계좌/.test(q)&&/환급/.test(q))result+=' 우리카드 수령은 사업자가 해당 카드를 지원하고 거래가 매칭되는지 확인해야 해요. 우리은행 외화계좌 자동 입금은 보장하거나 연결하지 않습니다.';
  if(/예산|가계부|지출/.test(q)){const s=T.ledgerSummary(state.expenses);result=`총 기록 비용은 ${won(s.gross)}, 실제 환급 수령은 ${won(s.actual)}으로 현재 실지출액은 ${won(s.net)}이에요. 미수령 환급 예정액 ${won(s.pending)}은 별도로 표시합니다. 충전·ATM 인출 원금은 소비에 중복 합산하지 않고 시연 비용만 반영해요.`;}
  return result;
}
function sendQuestion(q){if(!q.trim())return;const user=document.createElement('p');user.className='user';user.textContent=q;const bot=document.createElement('p');bot.textContent=answer(q);$('chat-messages').append(user,bot);$('chat-input').value='';$('chat-messages').scrollTop=$('chat-messages').scrollHeight;}
$('chat-form').onsubmit=e=>{e.preventDefault();sendQuestion($('chat-input').value.trim());};document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>sendQuestion(b.dataset.question));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('chat').hidden)chatOpen(false);});
function renderAll(){renderHome();renderCash();renderTax();renderBudget();}
initForms();renderAll();tab(location.hash.slice(1),true);if(storageWarning)toast('저장된 정보를 읽지 못해 시연 데이터를 표시했어요.');
