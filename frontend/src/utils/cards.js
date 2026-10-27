// 카드고릴라 카드 상세(https://www.card-gorilla.com/card/detail/{id}) 상단 혜택 중 해외 결제·여행 혜택만 옮겼습니다.
// 국내 전용 혜택과 국내외 공통 기본 혜택은 제외합니다. 혜택 조건은 바뀔 수 있어 확인일을 함께 둡니다.
// 조건은 혜택별 상세 안내의 전월실적·한도·횟수를 요약했습니다. 상세 안내에 없으면 '확인 필요'로 둡니다.
// 상세 안내와 다른 상단 요약(SOL트래블J '일본 3대 편의점'은 상세상 국내 편의점)은 쓰지 않습니다.
const CHECKED_AT = '2026-10-27';
const cardCategories = { travel: '외화 트래블카드', standard: '일반 해외결제 카드', none: '보유 카드 없음' };
const b = (text, condition) => ({ text, condition });
const hanaMoney = '전월실적 조건 없음 · 해외·항공·면세점·여행 통합 월 5만 하나머니';

// 외화 트래블카드: 외화결제계좌·외화 충전 잔액에서 현지 통화로 결제되는 카드
// 일반 해외결제 카드: 원화로 청구·출금되는 카드 (이름에 '트래블'이 있어도 신용카드는 여기에 둡니다)
const presetCards = [
  { id: '2394', category: 'travel', issuer: '하나카드', name: '트래블로그 체크카드', kind: '체크', brands: ['Mastercard', 'UnionPay'], benefits: [
    b('해외 가맹점 이용 수수료 면제', '전월실적 조건 없음'),
    b('해외 ATM 인출 수수료 면제', '전월실적 조건 없음 · 현지 ATM 수수료 별도')] },
  { id: '2667', category: 'travel', issuer: '신한카드', name: '신한카드 SOL트래블 체크', kind: '체크', brands: ['Mastercard'], benefits: [
    b('해외 이용 수수료 면제', '전월실적 조건 없음 · 한도 없음'),
    b('더라운지 무료 입장', '전월 국내 이용 30만원 이상 · 반기 1회(연 2회)'),
    b('해외 대중교통 1% 할인', '전월실적 조건 없음 · 컨택리스 결제 시')] },
  { id: '2847', category: 'travel', issuer: '신한카드', name: '신한카드 SOL트래블J 체크', kind: '체크', brands: ['Mastercard'], benefits: [
    b('해외이용 수수료 면제', '전월실적 조건 없음 · 한도 없음'),
    b('일본 돈키호테·스타벅스 50% 결제일 할인', '전월 국내 이용 30만원 이상 · 돈키호테 반기 2만원, 스타벅스 반기 5천원 한도')] },
  { id: '2977', category: 'travel', issuer: '신한카드', name: '신한카드 SOL트립앤J 체크', kind: '체크', brands: ['JCB'], benefits: [
    b('해외 이용 수수료 면제', '전월실적 조건 없음 · 한도 없음'),
    b('일본 돈키호테·편의점 50% 할인', '전월 국내 이용 30만원 이상 · 돈키호테 반기 2만원, 편의점 반기 5천원 한도')] },
  { id: '2691', category: 'travel', issuer: 'KB국민카드', name: '트래블러스 체크카드(토심이)', kind: '체크', brands: ['Mastercard'], benefits: [
    b('해외 이용 수수료 면제', '전월실적 조건 없음 · 해외 ATM 수수료는 월 10회 면제'),
    b('해외 가맹점 10% 할인', '전월 20만원 이상 · 월 1만원 한도')] },
  { id: '2700', category: 'travel', issuer: '우리카드', name: '위비트래블 체크카드', kind: '체크', brands: ['Mastercard'], benefits: [
    b('해외 가맹점 이용 수수료 면제', '전월실적 조건 없음 · 한도 없음'),
    b('해외 5% 캐시백', '전월 국내 이용 20만원 이상 · 건당 최대 1천원')] },
  { id: '2727', category: 'travel', issuer: 'NH농협카드', name: 'NH트래블리체크카드', kind: '체크', brands: ['Mastercard'], benefits: [
    b('해외가맹점 해외이용수수료 면제', '전월실적 조건 없음 · 해외 ATM 수수료는 월 10회 면제')] },
  { id: '2569', category: 'standard', issuer: '우리카드', name: '트래블월렛 우리카드', kind: '신용', brands: ['VISA'], benefits: [
    b('해외 이용 수수료 면제 서비스', '확인 필요'),
    b('해외 이용 트래블 포인트 2.0% 적립', '전월 국내 이용 40만원 이상 · 한도 없음')] },
  { id: '2613', category: 'standard', issuer: '우리카드', name: 'ALL 우리카드 Infinite', kind: '신용', brands: ['VISA'], benefits: [
    b('아코르플러스 유료 멤버십 자동가입', '연회비 납부 시 자동 가입')] },
  { id: '2961', category: 'standard', issuer: '하나카드', name: '트래블로그+(플러스) 신용카드', kind: '신용', brands: ['Mastercard'], benefits: [
    b('해외 가맹점 3% 적립', hanaMoney),
    b('항공·면세점·여행 3% 적립', hanaMoney)] },
  { id: '2529', category: 'standard', issuer: '하나카드', name: '트래블로그 신용카드', kind: '신용', brands: ['Mastercard'], benefits: [
    b('해외 가맹점 3% 적립', hanaMoney),
    b('항공·면세점·여행 3% 적립', hanaMoney)] },
  { id: '2722', category: 'standard', issuer: '신한카드', name: '신한카드 SOL트래블', kind: '신용', brands: ['Mastercard'], benefits: [
    b('해외 이용·ATM 수수료 면제', '전월 국내 이용 40만원 이상 · 한도 없음'),
    b('해외 결제 환율 100% 우대', '전월 국내 이용 40만원 이상 · 한도 없음')] },
  { id: '945', category: 'standard', issuer: '신한카드', name: '신한카드 The CLASSIC-S', kind: '신용', brands: ['VISA', 'Mastercard'], benefits: [
    b('해외·면세점 2% 추가적립', '전월 50만원 이상 · 월 5만 포인트 한도')] },
  { id: '716', category: 'standard', issuer: '신한카드', name: '메리어트 본보이™ 더 베스트 신한카드', kind: '신용', brands: ['VISA'], benefits: [
    b('메리어트 참여호텔 무료숙박권 제공', '연회비 납부 · 연회비 주기 내 100만원 이상 이용 · 연 1회'),
    b('메리어트 참여호텔 이용 시 1천원당 5P 적립', '전월 국내 이용 30만원 이상'),
    b('메리어트 본보이™ 골드엘리트 멤버십 제공', '카드 발급·갱신 시 자동 부여')] },
  { id: '2676', category: 'standard', issuer: '삼성카드', name: '삼성 iD GLOBAL 카드', kind: '신용', brands: ['Mastercard'], benefits: [
    b('해외 이용 2% 할인', '전월실적 조건 없음 · 통합 월 30만원 한도'),
    b('공항라운지 연 2회 무료 이용', '전월 50만원 이상 · 월 1회')] },
  { id: '2423', category: 'standard', issuer: 'KB국민카드', name: '노리2 체크카드(Global)', kind: '체크', brands: ['Mastercard'], benefits: [
    b('해외 가맹점 2% 할인', '전월 30만원 이상 · 월 5천원 한도'),
    b('공항라운지 연 1회 이용권', '전월 30만원 이상')] },
  { id: '2846', category: 'standard', issuer: 'NH농협카드', name: '클래시 트래블카드', kind: '신용', brands: ['Mastercard'], benefits: [
    b('해외가맹점 3~4% 적립', '상시 3% · 전월 국내 100만원 초과 시 4% · 통합 월 10만점 한도'),
    b('국내·외 공항라운지 무료입장', '전월 50만원 이상 · 월 2회, 연 4회')] },
  { id: '2786', category: 'standard', issuer: '롯데카드', name: '힐튼 아너스 아멕스 프리미엄', kind: '신용', brands: ['AMEX'], benefits: [
    b('전세계 힐튼 호텔 주말 숙박권', '연회비 납부 · 지난해 2,400만원 이상 이용 · 연 1회 2매'),
    b('힐튼 아너스 멤버십 등급 업그레이드', '골드 자동 제공 · 다이아몬드는 연 2,400만원 이상 이용')] },
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
