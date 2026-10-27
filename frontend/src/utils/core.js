// 시연 계산 로직. 실제 환율이나 금융상품 조건을 조회하지 않습니다.
const countries = {
  FR: { name: '프랑스', english: 'France', city: '파리', hero: 'Paris', flag: '🇫🇷', code: 'EUR', symbol: '€', currency: '유로', rate: 1580, airport: 'CDG', atmFee: 3 },
  JP: { name: '일본', english: 'Japan', city: '도쿄', hero: 'Tokyo', flag: '🇯🇵', code: 'JPY', symbol: '¥', currency: '엔', rate: 9.5, airport: 'HND', atmFee: 220 },
  TH: { name: '태국', english: 'Thailand', city: '방콕', hero: 'Bangkok', flag: '🇹🇭', code: 'THB', symbol: '฿', currency: '바트', rate: 43, airport: 'BKK', atmFee: 150 }
};
const methodNames = { travel: '외화 트래블카드', standard: '일반 해외결제 카드', cash: '현지 현금' };
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const krw = n => Math.round(n);
const valid = n => Number.isFinite(n) && n >= 0;
const paymentCost = (amount, method, rate) => {
  if (!valid(amount) || !Number.isFinite(rate) || rate <= 0) throw new Error('금액과 환율을 확인해 주세요.');
  const spread = method === 'cash' ? .02 : method === 'standard' ? .013 : 0;
  return krw(amount * rate * (1 + spread));
};
function cashCandidates(input) {
  const { needed, cash, balance, rate, operatorFee, card, account, supported, walk, offset = 0, board, cashKRW = 0 } = input;
  if (![needed, cash, balance, rate, operatorFee, walk, offset].every(valid) || rate <= 0) throw new Error('현금 비교 조건을 확인해 주세요.');
  const shortage = Math.max(0, round(needed - cash));
  if (shortage === 0) return { shortage: 0, candidates: [] };
  const principal = krw(shortage * rate);
  const candidates = [];
  const add = (id, name, minutes, cost, detail) => {
    if (minutes <= walk) candidates.push({ id, name, walk: minutes, cost, principal, fee: cost - principal, detail, amount: shortage });
  };
  if (card !== 'none') {
    const fee = krw(operatorFee * rate + (card === 'standard' ? shortage * rate * .01 + 3000 : 0));
    if (card === 'standard' || balance >= shortage + operatorFee) add('a', '보유 카드 → 은행 ATM A', 4 + offset, principal + fee, `현지 운영사 비용 ${operatorFee} 포함 · 은행 ATM · 24시간 이용 가정`);
    if (account && supported) add('b', '외화 충전 → 은행 ATM B', 8 + offset, principal + krw(operatorFee * rate * .5 + shortage * rate * .002 + (card === 'standard' ? shortage * rate * .01 + 3000 : 0)), '충전 비용 0.2% + 운영사 비용 포함 · 충전 1분 · 09:00–20:00 가정');
  }
  const exchangeRate = board?.rate ?? rate * 1.025;
  const exchangeFee = board?.fee ?? krw(rate * .5);
  const exchangeCost = krw(shortage * exchangeRate) + exchangeFee;
  if (valid(exchangeRate) && exchangeRate > 0 && valid(exchangeFee) && valid(cashKRW) && cashKRW >= exchangeCost) add('c', '원화 현금 → 환전소 C', 6 + offset, exchangeCost, `${board ? '직접 확인한' : '가정'} 적용 환율 ${round(exchangeRate)}원 + 고정 비용 ${exchangeFee}원 · 10:00–19:00 가정 · 보유 원화로 환전 가능`);
  return { shortage, candidates: candidates.sort((a, b) => a.cost - b.cost) };
}
function groupReceipts(receipts) {
  const groups = new Map();
  receipts.forEach(r => {
    const key = `${r.store.normalize('NFC').trim().toLocaleLowerCase()}|${r.date}`;
    if (!groups.has(key)) groups.set(key, { key, store: r.store, date: r.date, amount: 0, ids: [], eligible: true, docs: true, instant: true, city: true, method: r.method, country: r.country || 'FR' });
    const g = groups.get(key);
    g.amount = round(g.amount + r.amount); g.ids.push(r.id);
    g.eligible = g.eligible && r.eligible; g.docs = g.docs && r.docs;
    g.instant = g.instant && r.instant; g.city = g.city && r.city;
    if (g.method !== r.method) g.method = 'mixed';
  });
  return [...groups.values()];
}
function refundOptions(group) {
  if (!group || group.country !== 'FR' || !group.eligible || !group.docs || group.amount <= 100) return [];
  const options = [{ id: 'airport-card', place: '공항·출국 시점', receive: '카드', timing: '세관 확인 후 · 출국 후 수령 가정', refund: round(group.amount * .12), fxFactor: .995, time: '세관 확인·대기 필요', customs: true }];
  options.push({ id: 'airport-cash', place: '공항·출국 시점', receive: '현금', timing: '세관 확인 후 · 현장 수령 가정', refund: Math.max(0, round(group.amount * .105 - 3)), fxFactor: .98, time: '현장 고정 비용 €3 차감', customs: true });
  if (group.instant) options.push({ id: 'store', place: '매장 즉시환급', receive: '구매 시 차감', timing: '구매 시점에 가격에서 차감 가정', refund: round(group.amount * .10), fxFactor: 1, time: '매장 지원 확인 가정 · 사후 세관 확인 필요', customs: true });
  if (group.city) options.push({ id: 'city', place: '시내 환급 창구', receive: '카드', timing: '시내 신청 후 수령 가정', refund: Math.max(0, round(group.amount * .11 - 2)), fxFactor: .995, time: '창구 지원 확인 가정 · 사후 세관 확인 필요', customs: true });
  return options;
}
function combinations(group, rate) {
  const options = refundOptions(group);
  return ['travel', 'standard', 'cash'].flatMap(method => options.map(option => {
    const gross = paymentCost(group.amount, method, rate);
    const refund = option.id === 'store' ? gross - paymentCost(round(group.amount - option.refund), method, rate) : krw(option.refund * rate * option.fxFactor);
    return { method, ...option, gross, refundKRW: refund, net: gross - refund };
  })).sort((a, b) => a.net - b.net);
}
function ledgerSummary(expenses) {
  const purchases = expenses.filter(e => e.type === 'purchase');
  const fees = expenses.reduce((s, e) => s + (e.fee || 0), 0);
  const gross = purchases.reduce((s, e) => s + e.cost, 0) + expenses.filter(e => e.type !== 'purchase').reduce((s, e) => s + (e.fee || 0), 0);
  const actual = expenses.reduce((s, e) => s + (e.actualRefund ?? 0), 0);
  const pending = expenses.reduce((s, e) => s + (e.actualRefund == null ? e.expectedRefund || 0 : 0), 0);
  return { purchases, fees, gross, actual, pending, net: gross - actual, projected: gross - actual - pending };
}
function parseCash(text, config) {
  const code = config.code;
  const units = { EUR: '유로|EUR|€', THB: '바트|THB|฿', JPY: '엔|JPY|¥' };
  const any = text.match(/(?:유로|EUR|€|바트|THB|฿|엔|JPY|¥)/i)?.[0];
  if (any && !new RegExp(units[code], 'i').test(any)) return { error: '여행 설정의 통화와 문장의 통화가 달라요. 국가 설정을 먼저 맞춰 주세요.' };
  const pattern = new RegExp(`([\\d,]+(?:\\.\\d+)?)\\s*(?:${units[code]})`, 'i');
  const reverse = new RegExp(`(?:${units[code]})\\s*([\\d,]+(?:\\.\\d+)?)`, 'i');
  const match = text.match(pattern) || text.match(reverse);
  if (!match) return { error: `필요한 총 현금을 숫자와 통화로 적어 주세요. 예: 150${config.currency}. 여러 금액이 있으면 아래 조건도 직접 확인해 주세요.` };
  const amount = Number(match[1].replaceAll(',', ''));
  if (!valid(amount) || amount > 1000000) return { error: '금액은 0~1,000,000 사이로 입력해 주세요.' };
  return { amount };
}

export { countries, methodNames, round, krw, valid, paymentCost, cashCandidates, groupReceipts, refundOptions, combinations, ledgerSummary, parseCash };
