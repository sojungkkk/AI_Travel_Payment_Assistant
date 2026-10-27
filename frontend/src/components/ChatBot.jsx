import { useEffect, useRef, useState } from 'react';
import * as T from '../utils/core.js';
import { foreign as formatForeign, won } from '../utils/format.js';
import serviceIcon from '../assets/travel-pudding.png';

export default function ChatBot({ state, currentCash }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: '안녕하세요! 여행 준비부터 환급까지 도와드려요. 여행 정보와 선택한 영수증을 바탕으로 설명해 드릴게요.' }]);
  const inputRef = useRef(null), messagesRef = useRef(null);
  const groups = T.groupReceipts(state.receipts);
  const group = groups.find(item => item.ids.includes(state.selected)) || groups[0];
  const activeGroup = () => group;
  const foreign = (amount, country = state.trip.country) => formatForeign(amount, country);

  useEffect(() => {
    if (open) { inputRef.current.focus(); messagesRef.current.scrollTop = messagesRef.current.scrollHeight; }
  }, [open, messages]);

  useEffect(() => {
    const close = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);

  function sendQuestion(question) {
    if (!question.trim()) return;
    setMessages(previous => [...previous, { role: 'user', content: question.trim() }, { role: 'assistant', content: answer(question.trim()) }]);
    setInput('');
  }

  function answer(q){
    const g=activeGroup(),c=T.countries[state.trip.country],options=T.refundOptions(g),combos=T.combinations(g,1580);let result=`${state.trip.city} 여행의 결제, 환전, 영수증, 환급과 예산 질문을 도와드려요. 화면의 시연 조건을 바탕으로 설명합니다.`;
    if(/카드|결제|수수료/.test(q))result=`보유 수단은 ${T.methodNames[state.trip.card]||'카드 없음'}이에요. 현지통화 ${c.code} 결제와 해외원화결제(DCC)의 비용 조건을 확인하세요. 시연 계산은 트래블카드 0%, 일반 카드 1.3%지만 실제 상품 혜택이 아닙니다. 우리카드·우리은행 공식 채널에서 지원 통화, 한도, 해외 사용 조건을 확인해 주세요.`;
    if(/현금|ATM|atm|환전|인출/.test(q)){const best=currentCash.candidates[0];result=best?`현재 입력 조건에서 ${foreign(currentCash.shortage)}를 추가 확보할 때, ${best.name}의 시연 총비용이 ${won(best.cost)}으로 비교 가능한 후보 중 가장 낮아요. 현지 운영사 비용을 포함한 계산이며 실제 위치·영업 정보는 연결되지 않았어요. 카드·잔액·충전 지원 여부를 확인해 주세요.`:'현재 비교 조건에서 추가 현금이 필요하지 않거나 이용 가능한 후보가 없어요. 환전·ATM 화면의 금액, 보유 카드, 외화잔액과 도보 시간을 확인해 주세요.';}
    if(/환급|택스|영수증/.test(q)){if(!g)result='등록된 영수증이 없어요. 택스 리펀드에서 거래와 환급서류 발급 여부를 입력해 주세요.';else if(!options.length)result=`${g.store}의 ${foreign(g.amount,'FR')} 구매는 ${!g.docs?'환급서류 발급':!g.eligible?'거주·체류 등 자격':'동일 매장·같은 날의 구매금액'} 확인이 필요해요. 확인 전에는 환급액과 장소를 확정할 수 없어요.`;else{const airport=combos.find(x=>x.method==='travel'&&x.id==='airport-card'),store=combos.find(x=>x.method==='travel'&&x.id==='store');result=`선택한 영수증은 ${g.store}, ${g.date}, ${foreign(g.amount,'FR')} 구매예요. 시연 조건에서 공항 카드 환급 예상액은 ${won(airport.refundKRW)}입니다.${store?' 매장 즉시환급 대비 최종 지출액이 '+won(store.net-airport.net)+' 낮게 계산돼요.':' 매장 즉시환급은 지원 확인이 없어 비교에서 제외했어요.'} 공항 방식은 최종 EU 출국 시 세관 확인과 대기가 필요해요. 즉시환급도 사후 서류 확인 조건을 따라야 합니다. 실제 지원·수수료·카드 환급 가능 여부는 사업자와 카드사 확인이 필요해요.`;}}
    if(/우리카드|우리은행|외화계좌/.test(q)&&/환급/.test(q))result+=' 우리카드 수령은 사업자가 해당 카드를 지원하고 거래가 매칭되는지 확인해야 해요. 우리은행 외화계좌 자동 입금은 보장하거나 연결하지 않습니다.';
    if(/예산|가계부|지출/.test(q)){const s=T.ledgerSummary(state.expenses);result=`총 기록 비용은 ${won(s.gross)}, 실제 환급 수령은 ${won(s.actual)}으로 현재 실지출액은 ${won(s.net)}이에요. 미수령 환급 예정액 ${won(s.pending)}은 별도로 표시합니다. 충전·ATM 인출 원금은 소비에 중복 합산하지 않고 시연 비용만 반영해요.`;}
    return result;
  }

  return <>
    <button id="chat-toggle" aria-expanded={open} aria-controls="chat" onClick={() => setOpen(previous => !previous)}><img className="chat-mascot" src={serviceIcon} alt="" /> 여행WON해 도우미 <i>AI</i></button>
    <section id="chat" hidden={!open} aria-label="여행WON해 여행 금융 도우미">
      <div className="chat-head">
        <div>
          <img className="chat-mascot" src={serviceIcon} alt="" />
          <div>
            <b>여행WON해 도우미</b>
            <small>내 여행과 영수증을 함께 보는 도우미</small>
          </div>
        </div>
        <button id="chat-close" aria-label="채팅 닫기" onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="chat-demo">
        규칙 기반 시연 · 실제 생성형 AI 미연결
      </div>
      <div id="chat-context">
        참조: {state.trip.city} · {T.countries[state.trip.country].code} · {T.methodNames[state.trip.card] || '카드 없음'}{group && ` / 선택 영수증 ${group.store} ${group.date} ${foreign(group.amount, 'FR')}`}
      </div>
      <div id="chat-messages" aria-live="polite" ref={messagesRef}>
        {messages.map((message, index) => <p key={index} className={message.role === 'user' ? 'user' : undefined}>{message.content}</p>)}
      </div>
      <div className="chat-suggestions">
        <button data-question="이 영수증, 공항에서 환급받아야 해?" onClick={() => sendQuestion("이 영수증, 공항에서 환급받아야 해?")}>이 영수증, 공항에서 환급받아야 해?</button>
        <button data-question="ATM과 환전소 중 어디가 유리해?" onClick={() => sendQuestion("ATM과 환전소 중 어디가 유리해?")}>ATM과 환전소 중 어디가 유리해?</button>
      </div>
      <form id="chat-form" onSubmit={event => { event.preventDefault(); sendQuestion(input); }}>
        <label className="sr-only" htmlFor="chat-input">
          여행 금융 질문
        </label>
        <input id="chat-input" placeholder="여행 금융에 대해 물어보세요" maxLength="500" required name="chat-input" ref={inputRef} value={input} onChange={event => setInput(event.target.value)} />
        <button aria-label="질문 보내기">↑</button>
      </form>
    </section>
  </>;
}
