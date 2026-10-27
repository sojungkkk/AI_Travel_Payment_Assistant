// 카드고릴라 카드 상세(https://www.card-gorilla.com/card/detail/{id}) 상단 혜택 중 해외 결제·여행 혜택만 옮겼습니다.
// 국내 전용 혜택과 국내외 공통 기본 혜택은 제외합니다. 혜택 조건은 바뀔 수 있어 확인일을 함께 둡니다.
const CHECKED_AT = '2026-10-27';
const cardCategories = { travel: '외화 트래블카드', standard: '일반 해외결제 카드', none: '보유 카드 없음' };

// 외화 트래블카드: 외화결제계좌·외화 충전 잔액에서 현지 통화로 결제되는 카드
// 일반 해외결제 카드: 원화로 청구·출금되는 카드 (이름에 '트래블'이 있어도 신용카드는 여기에 둡니다)
const presetCards = [
  { id: '2394', category: 'travel', issuer: '하나카드', name: '트래블로그 체크카드', kind: '체크', brands: ['Mastercard', 'UnionPay'], benefits: ['해외 가맹점 이용 수수료 면제', '해외 ATM 인출 수수료 면제'] },
  { id: '2667', category: 'travel', issuer: '신한카드', name: '신한카드 SOL트래블 체크', kind: '체크', brands: ['Mastercard'], benefits: ['해외 이용 수수료 면제', '더라운지 무료 입장', '해외 대중교통 1% 할인'] },
  { id: '2847', category: 'travel', issuer: '신한카드', name: '신한카드 SOL트래블J 체크', kind: '체크', brands: ['Mastercard'], benefits: ['해외이용 수수료 면제', '일본 돈키호테·스타벅스 50% 결제일 할인', '일본 3대 편의점 5% 결제일 할인'] },
  { id: '2977', category: 'travel', issuer: '신한카드', name: '신한카드 SOL트립앤J 체크', kind: '체크', brands: ['JCB'], benefits: ['해외 이용 수수료 면제', '일본 돈키호테·편의점 50% 할인'] },
  { id: '2691', category: 'travel', issuer: 'KB국민카드', name: '트래블러스 체크카드(토심이)', kind: '체크', brands: ['Mastercard'], benefits: ['해외 이용 수수료 면제', '해외 가맹점 10% 할인'] },
  { id: '2700', category: 'travel', issuer: '우리카드', name: '위비트래블 체크카드', kind: '체크', brands: ['Mastercard'], benefits: ['해외 가맹점 이용 수수료 면제', '해외 5% 캐시백'] },
  { id: '2727', category: 'travel', issuer: 'NH농협카드', name: 'NH트래블리체크카드', kind: '체크', brands: ['Mastercard'], benefits: ['해외가맹점 해외이용수수료 면제'] },
  { id: '2569', category: 'standard', issuer: '우리카드', name: '트래블월렛 우리카드', kind: '신용', brands: ['VISA'], benefits: ['해외 이용 수수료 면제 서비스', '해외 이용 트래블 포인트 2.0% 적립'] },
  { id: '2613', category: 'standard', issuer: '우리카드', name: 'ALL 우리카드 Infinite', kind: '신용', brands: ['VISA'], benefits: ['아코르플러스 유료 멤버십 자동가입'] },
  { id: '2961', category: 'standard', issuer: '하나카드', name: '트래블로그+(플러스) 신용카드', kind: '신용', brands: ['Mastercard'], benefits: ['해외 가맹점 3% 적립', '항공·면세점·여행 3% 적립'] },
  { id: '2529', category: 'standard', issuer: '하나카드', name: '트래블로그 신용카드', kind: '신용', brands: ['Mastercard'], benefits: ['해외 가맹점 3% 적립 (월 적립한도 5만 하나머니)', '항공·면세점·여행 3% 적립 (월 적립한도 5만 하나머니)'] },
  { id: '2722', category: 'standard', issuer: '신한카드', name: '신한카드 SOL트래블', kind: '신용', brands: ['Mastercard'], benefits: ['해외 이용·ATM 수수료 면제', '해외 결제 환율 100% 우대'] },
  { id: '945', category: 'standard', issuer: '신한카드', name: '신한카드 The CLASSIC-S', kind: '신용', brands: ['VISA', 'Mastercard'], benefits: ['해외·면세점 2% 추가적립'] },
  { id: '716', category: 'standard', issuer: '신한카드', name: '메리어트 본보이™ 더 베스트 신한카드', kind: '신용', brands: ['VISA'], benefits: ['메리어트 참여호텔 무료숙박권 제공', '메리어트 참여호텔 이용 시 1천원당 5P 적립', '메리어트 본보이™ 골드엘리트 멤버십 제공'] },
  { id: '2676', category: 'standard', issuer: '삼성카드', name: '삼성 iD GLOBAL 카드', kind: '신용', brands: ['Mastercard'], benefits: ['해외 이용 2% 할인', '공항라운지 연 2회 무료 이용'] },
  { id: '2423', category: 'standard', issuer: 'KB국민카드', name: '노리2 체크카드(Global)', kind: '체크', brands: ['Mastercard'], benefits: ['해외 가맹점 2% 할인', '공항라운지 연 1회 이용권'] },
  { id: '2846', category: 'standard', issuer: 'NH농협카드', name: '클래시 트래블카드', kind: '신용', brands: ['Mastercard'], benefits: ['해외가맹점 3~4% 적립', '국내·외 공항라운지 무료입장'] },
  { id: '2786', category: 'standard', issuer: '롯데카드', name: '힐튼 아너스 아멕스 프리미엄', kind: '신용', brands: ['AMEX'], benefits: ['전세계 힐튼 호텔 주말 숙박권', '힐튼 아너스 멤버십 등급 업그레이드'] },
];

const findPreset = id => presetCards.find(card => card.id === id);
const issuersFor = category => [...new Set(presetCards.filter(card => card.category === category).map(card => card.issuer))]
  .sort((a, b) => (b === '우리카드') - (a === '우리카드') || a.localeCompare(b, 'ko'));
const cardsFor = (category, issuer) => presetCards.filter(card => card.category === category && (!issuer || card.issuer === issuer));
const cardBenefits = entry => findPreset(entry.id)?.benefits || [];
const primaryCategory = cards => cards.some(card => card.category === 'travel') ? 'travel'
  : cards.some(card => card.category === 'standard') ? 'standard' : 'none';

function normalizeCards(trip = {}) {
  if (Array.isArray(trip.cards)) return trip.cards.filter(card => card && (card.category === 'travel' || card.category === 'standard') && typeof card.id === 'string');
  return trip.card === 'travel' || trip.card === 'standard' ? [{ id: 'custom', category: trip.card, issuer: '', name: '' }] : [];
}

export { CHECKED_AT, cardCategories, presetCards, findPreset, issuersFor, cardsFor, cardBenefits, primaryCategory, normalizeCards };
