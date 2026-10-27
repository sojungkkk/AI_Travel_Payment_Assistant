const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../frontend/src/utils/cards.js');
const travel = {id:'2394',category:'travel',issuer:'하나카드',name:'트래블로그 체크카드'};
const standard = {id:'2961',category:'standard',issuer:'하나카드',name:'트래블로그+(플러스) 신용카드'};
test('트래블카드가 하나라도 있으면 비용 계산은 트래블카드 기준으로 한다',()=>{
  assert.equal(C.primaryCategory([standard,travel]),'travel');
  assert.equal(C.primaryCategory([standard]),'standard');
  assert.equal(C.primaryCategory([]),'none');
});
test('일반 해외결제 카드의 카드사 목록은 우리카드가 맨 위다',()=>{
  const issuers=C.issuersFor('standard');assert.equal(issuers[0],'우리카드');assert.equal(new Set(issuers).size,issuers.length);
});
test('카드사별 프리셋은 5장 이하이고 대분류별로 나뉜다',()=>{
  for(const issuer of C.issuersFor('standard'))assert.ok(C.cardsFor('standard',issuer).length<=5,issuer);
  assert.ok(C.cardsFor('travel').length>0);
  assert.ok(C.cardsFor('travel').every(card=>card.category==='travel'));
  assert.ok(C.cardsFor('standard','하나카드').every(card=>card.category==='standard'&&card.issuer==='하나카드'));
});
test('혜택은 해외 혜택만 보여 주고 국내 혜택은 뺀다',()=>{
  assert.deepEqual(C.cardBenefits(standard).map(b=>b.text),['해외 가맹점 3% 적립','항공·면세점·여행 3% 적립']);
  assert.deepEqual(C.cardBenefits(travel).map(b=>b.text),['해외 가맹점 이용 수수료 면제','해외 ATM 인출 수수료 면제']);
  assert.ok(C.cardBenefits({id:'2847'}).every(b=>!b.text.includes('편의점')),'상세 안내상 국내 편의점 혜택');
});
test('모든 프리셋 혜택에 적용 조건이 있다',()=>{
  for(const card of C.presetCards)for(const b of card.benefits)assert.ok(b.text&&b.condition,card.name);
});
test('조건은 카드 전체가 아니라 혜택마다 따로 둔다',()=>{
  const [discount,lounge]=C.cardBenefits({id:'2676'});
  assert.ok(discount.condition.includes('조건 없음'));assert.ok(lounge.condition.includes('50만원'));
});
test('직접 입력한 카드는 혜택을 단정하지 않는다',()=>{
  assert.deepEqual(C.cardBenefits({id:'custom',category:'standard',issuer:'우리카드',name:'내 카드'}),[]);
});
test('카드 목록이 없던 저장 데이터는 대분류만 유지해 변환한다',()=>{
  assert.deepEqual(C.normalizeCards({card:'standard'}),[{id:'custom',category:'standard',issuer:'',name:''}]);
  assert.deepEqual(C.normalizeCards({card:'none'}),[]);
  assert.deepEqual(C.normalizeCards({card:'travel',cards:[travel,{id:3,category:'x'}]}),[travel]);
});
