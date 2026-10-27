const {test} = require('node:test');
const assert = require('node:assert/strict');
const T = require('../frontend/src/utils/core.js');
const group = {country:'FR',amount:420,eligible:true,docs:true,instant:true,city:false};
const cash = {needed:150,cash:80,balance:250,rate:1580,operatorFee:3,card:'travel',account:true,supported:true,walk:15,cashKRW:300000};
test('동일 현금 수령액으로 원금과 모든 비용을 합산한다',()=>{
  const result=T.cashCandidates(cash);assert.equal(result.shortage,70);assert.equal(result.candidates.length,3);
  result.candidates.forEach(x=>{assert.equal(x.amount,70);assert.equal(x.cost,x.principal+x.fee);});
  assert.equal(result.candidates[0].cost,113191);
});
test('인출 카드, 충전 지원, 외화잔액, 원화 보유액을 후보에 반영한다',()=>{
  assert.deepEqual(T.cashCandidates({...cash,card:'none'}).candidates.map(x=>x.id),['c']);
  assert.equal(T.cashCandidates({...cash,supported:false,balance:0}).candidates.length,1);
  assert.equal(T.cashCandidates({...cash,account:false}).candidates.some(x=>x.id==='b'),false);
  assert.equal(T.cashCandidates({...cash,balance:72,supported:false,cashKRW:0}).candidates.length,0);
  assert.equal(T.cashCandidates({...cash,walk:5}).candidates.length,1);
});
test('이미 가진 현금이 충분하면 인출하지 않는다',()=>assert.deepEqual(T.cashCandidates({...cash,cash:200}),{shortage:0,candidates:[]}));
test('서류·자격·국가·최소금액이 미확인인 환급을 계산하지 않는다',()=>{
  for(const change of [{docs:false},{eligible:false},{amount:100},{country:'JP'}])assert.equal(T.refundOptions({...group,...change}).length,0);
  assert.ok(T.refundOptions({...group,amount:100.01}).length>0);
});
test('지원 여부가 확인되지 않은 매장·시내 환급을 제외한다',()=>{
  const options=T.refundOptions({...group,instant:false});assert.deepEqual(options.map(x=>x.id),['airport-card','airport-cash']);
  assert.ok(T.refundOptions({...group,city:true}).some(x=>x.id==='city'));
});
test('구매금액, 환전 가산율, 카드 수수료와 환급 환율을 반영한다',()=>{
  const all=T.combinations(group,1580);assert.equal(all.length,9);assert.equal(all[0].method,'travel');assert.equal(all[0].id,'airport-card');assert.equal(all[0].net,584366);
  all.forEach(x=>assert.equal(x.net,x.gross-x.refundKRW));
});
test('매장 차감에는 차감된 금액의 카드 수수료만 적용한다',()=>{
  const row=T.combinations(group,1580).find(x=>x.method==='standard'&&x.id==='store');
  assert.equal(row.net,T.paymentCost(378,'standard',1580));
});
test('정규화한 동일 매장·같은 날만 합산한다',()=>{
  const receipts=[{id:'1',store:' 파리 ',date:'2026-11-10',amount:60,...group},{id:'2',store:'파리',date:'2026-11-10',amount:50,...group},{id:'3',store:'파리',date:'2026-11-11',amount:20,...group}].map((r,i)=>({...r,amount:[60,50,20][i]}));
  const grouped=T.groupReceipts(receipts);assert.equal(grouped.length,2);assert.equal(grouped[0].amount,110);assert.equal(grouped[0].ids.length,2);
});
test('충전·인출 원금은 소비에서 제외하고 비용만 반영한다',()=>{
  const report=T.ledgerSummary([{type:'purchase',cost:100000,fee:1000,expectedRefund:12000,actualRefund:null},{type:'atm',cost:200000,fee:3000},{type:'topup',cost:100000,fee:200}]);
  assert.equal(report.gross,103200);assert.equal(report.fees,4200);assert.equal(report.pending,12000);assert.equal(report.net,103200);assert.equal(report.projected,91200);
});
test('수령액 0원도 실제 기록으로 취급하고 예정액을 중복 차감하지 않는다',()=>{
  const s=T.ledgerSummary([{type:'purchase',cost:10000,fee:0,expectedRefund:1000,actualRefund:0},{type:'purchase',cost:20000,fee:0,expectedRefund:2000,actualRefund:1800}]);
  assert.equal(s.pending,0);assert.equal(s.actual,1800);assert.equal(s.net,28200);
});
test('자연어의 금액·통화를 파싱하고 다른 통화와 불명확한 입력을 보류한다',()=>{
  assert.equal(T.parseCash('현금 3,000바트 필요해',T.countries.TH).amount,3000);
  assert.equal(T.parseCash('€150 필요',T.countries.FR).amount,150);
  assert.ok(T.parseCash('3000바트',T.countries.FR).error);assert.ok(T.parseCash('현금 필요해',T.countries.FR).error);
});
test('금액·환율 검증 및 원화 단위 반올림',()=>{
  assert.throws(()=>T.paymentCost(-1,'travel',1580));assert.throws(()=>T.paymentCost(1,'travel',0));
  assert.equal(T.paymentCost(.01,'travel',1580),16);assert.equal(T.round(.1+.2),.3);
});
