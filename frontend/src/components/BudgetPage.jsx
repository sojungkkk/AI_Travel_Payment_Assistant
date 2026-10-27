import { useRef, useState } from 'react';
import * as T from '../utils/core.js';
import { colors, createId, foreign, won } from '../utils/format.js';

function guessCategory(name) {
  if (/카페|커피|식당|음식|비스트로|크루아상/.test(name)) return '음식';
  if (/호텔|숙소|숙박/.test(name)) return '숙박';
  if (/택시|지하철|버스|교통|공항/.test(name)) return '교통';
  if (/쇼핑|백화점|기념품|가방/.test(name)) return '쇼핑';
  if (/미술관|박물관|입장|관광/.test(name)) return '관광';
  return '기타';
}

export default function BudgetPage({ state, setState, hidden, notify }) {
  const [draft, setDraft] = useState({ name: '', amount: '', category: '음식', type: 'purchase', method: 'travel', date: state.trip.depart });
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [actualId, setActualId] = useState(null);
  const [actualAmount, setActualAmount] = useState('');
  const dialog = useRef(null);
  const summary = T.ledgerSummary(state.expenses);
  const percent = state.trip.budget ? summary.gross / state.trip.budget * 100 : 0;
  const purchaseTotal = summary.purchases.reduce((sum, item) => sum + item.cost, 0);
  let cursor = 0;
  const gradient = [];
  const categories = Object.entries(colors).map(([name, color]) => {
    const amount = summary.purchases.filter(item => item.category === name).reduce((sum, item) => sum + item.cost, 0);
    const part = purchaseTotal ? amount / purchaseTotal * 100 : 0;
    gradient.push(`${color} ${cursor}% ${cursor + part}%`);
    cursor += part;
    return { name, color, amount, part };
  });
  const metrics = [['현재 실지출액', summary.net, '기록된 비용 − 실제 수령한 환급'], ['환급 예정액', summary.pending, '미수령 예정액 · 확정 지출과 구분'], ['실제 환급 수령', summary.actual, '직접 확인해 기록한 수령 금액'], ['금융 비용', summary.fees, '환전·결제·인출 시연 비용 합계']];
  const cashTotal = summary.purchases.filter(item => item.method === 'cash').reduce((sum, item) => sum + item.cost, 0);
  const refunds = state.expenses.filter(item => item.refundChoice);
  const filtered = state.expenses.filter(item => filter === 'all' || (filter === 'purchase' ? item.type === 'purchase' : item.type !== 'purchase'));
  const topCategory = [...categories].sort((a, b) => b.amount - a.amount)[0].name;
  const travelSavings = summary.purchases.filter(item => item.method === 'travel').reduce((sum, item) => sum + Math.max(0, T.paymentCost(item.amount, 'cash', item.rate) - item.cost), 0);

  function submitExpense(event) {
    event.preventDefault();
    const name = draft.name.trim(), amount = Number(draft.amount);
    if (!name) return;
    if (state.expenses.some(item => item.name.normalize('NFC').toLowerCase() === name.normalize('NFC').toLowerCase() && item.amount === amount && item.date === draft.date && item.country === state.trip.country && item.type === draft.type)) {
      setMessage('같은 항목·날짜·금액의 거래가 있어요. 중복 여부를 확인해 주세요.'); return;
    }
    const country = T.countries[state.trip.country];
    const cost = draft.type === 'purchase' ? T.paymentCost(amount, draft.method, country.rate) : Math.round(amount * country.rate);
    const fee = draft.type === 'purchase' ? cost - Math.round(amount * country.rate) : draft.type === 'atm' ? Math.round(country.atmFee * country.rate) : Math.round(amount * country.rate * .002);
    const expense = { ...draft, id: createId(), name, amount, country: state.trip.country, rate: country.rate, cost, fee, expectedRefund: 0, actualRefund: null };
    setState(previous => ({ ...previous, expenses: [...previous.expenses, expense] }));
    setDraft(previous => ({ ...previous, name: '', amount: '' }));
    setMessage(draft.type === 'purchase' ? '지출을 기록했어요.' : '자금 이동으로 기록했어요. 원금은 소비 합계에서 제외하고 시연 비용만 반영해요.');
    notify('여행 기록을 저장했어요.');
  }

  function deleteExpense(identity) {
    setState(previous => ({ ...previous, expenses: previous.expenses.filter(item => item.id !== identity) }));
    notify('거래를 삭제했어요. 영수증 원본 기록은 유지돼요.');
  }

  function openRefund(item) {
    setActualId(item.id);
    setActualAmount(item.actualRefund ?? item.expectedRefund);
    dialog.current.showModal();
  }

  function submitRefund(event) {
    event.preventDefault();
    setState(previous => ({ ...previous, expenses: previous.expenses.map(item => item.id === actualId ? { ...item, actualRefund: Number(actualAmount) } : item) }));
    dialog.current.close();
    notify('실제 환급 수령액을 리포트에 반영했어요.');
  }

  function exportReport() {
    const report = ['여행WON해 — 여행 금융 리포트 (데모)', state.trip.city + ' · ' + state.trip.depart + ' ~ ' + state.trip.return, '',
      '총 기록 비용: ' + won(summary.gross), '실제 환급: ' + won(summary.actual), '환급 예정: ' + won(summary.pending),
      '현재 실지출액: ' + won(summary.net), '예정 환급 반영 예상액: ' + won(summary.projected), '금융 비용: ' + won(summary.fees), '',
      ...state.expenses.map(item => `${item.date} | ${item.name} | ${item.type} | ${foreign(item.amount, item.country)} | ${won(item.type === 'purchase' ? item.cost : item.fee)}`), '',
      '모든 환율·금융비용·환급률은 시연 가정입니다. 실제 금융 거래·상품 연동이 없으며, 충전·인출은 원금 제외·비용만 합산합니다.'].join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + report], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '여행WON해_여행금융리포트.txt';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <>
    <section className="page" id="budget" hidden={hidden} aria-labelledby="budget-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            MAKE EVERY MOMENT COUNT
          </div>
          <h1 id="budget-title">여행의 순간들, 한눈에.</h1>
          <p>작은 크루아상부터 소중한 기념품까지. 환급을 더한 나의 여행 기록</p>
        </div>
        <button className="secondary" id="export-report" onClick={exportReport}>리포트 내려받기 ↓</button>
      </div>
      <div className="metrics" id="budget-metrics">
        {metrics.map(([title, amount, note]) => <div className="metric" key={title}><span>{title}</span><strong>{won(amount)}</strong><small>{note}</small></div>)}
      </div>
      <div className="budget-layout">
        <div className="card spending-card">
          <div className="card-head">
            <h3>어디에 사용했을까요?</h3>
            <span className="badge neutral">카테고리별</span>
          </div>
          <div className="chart-wrap">
            <div id="donut" role="img" aria-label={'카테고리별 지출: ' + categories.map(item => item.name + ' ' + item.part.toFixed(1) + '%').join(', ')} style={{ background: purchaseTotal ? `conic-gradient(${gradient.join(',')})` : '#e6f0f8' }}>
              <div>
                <small>총 여행 지출</small>
                <b id="chart-total">{purchaseTotal.toLocaleString('ko-KR')}</b>
                <span>KRW</span>
              </div>
            </div>
            <div id="legend">
              {categories.map(item => <div className="legend-row" key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.part.toFixed(0)}%</b></div>)}
            </div>
          </div>
          <div className="budget-bar">
            <div>
              <span>여행 예산 사용률</span>
              <b id="budget-percent">{percent.toFixed(1)}%</b>
            </div>
            <div className="progress">
              <i id="budget-progress" style={{ width: Math.min(100, percent) + '%', background: percent > 100 ? '#c99064' : '#38a8df' }}></i>
            </div>
            <small id="budget-note">{(summary.gross > state.trip.budget ? '예산 초과 ' + won(summary.gross - state.trip.budget) : '남은 예산 ' + won(state.trip.budget - summary.gross)) + ' · 전체 예산 ' + won(state.trip.budget)}</small>
          </div>
          <div id="payment-split" className="payment-split">
            <span>현금 {purchaseTotal ? (cashTotal / purchaseTotal * 100).toFixed(0) : 0}%</span><span>카드 {purchaseTotal ? ((purchaseTotal - cashTotal) / purchaseTotal * 100).toFixed(0) : 0}%</span>
          </div>
        </div>
        <form className="card" id="expense-form" onSubmit={submitExpense}>
          <div className="card-head">
            <div>
              <h3>새로운 여행 기록</h3>
              <p>영수증・수동 거래를 함께 모아요.</p>
            </div>
            <span className="square-icon">＋</span>
          </div>
          <label>
            지출 항목
            <input id="expense-name" placeholder="예: 동네 카페에서 아침" maxLength="80" required name="expense-name" value={draft.name} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value, category: guessCategory(event.target.value) }))} />
          </label>
          <div className="two">
            <label>
              금액 
              <span className="currency-code">{T.countries[state.trip.country].code}</span>
              <input id="expense-amount" type="number" min="0.01" max="1000000" step="0.01" required name="expense-amount" value={draft.amount} onChange={event => setDraft(previous => ({ ...previous, amount: event.target.value }))} />
            </label>
            <label>
              카테고리
              <select id="category" name="category" value={draft.category} onChange={event => setDraft(previous => ({ ...previous, category: event.target.value }))}>
                <option>음식</option>
                <option>쇼핑</option>
                <option>교통</option>
                <option>숙박</option>
                <option>관광</option>
                <option>기타</option>
              </select>
            </label>
          </div>
          <div className="two">
            <label>
              거래 유형
              <select id="expense-type" name="expense-type" value={draft.type} onChange={event => setDraft(previous => ({ ...previous, type: event.target.value }))}>
                <option value="purchase">지출</option>
                <option value="atm">ATM 인출 · 자금 이동</option>
                <option value="topup">외화 충전 · 자금 이동</option>
              </select>
            </label>
            <label>
              결제 수단
              <select id="expense-method" name="expense-method" value={draft.method} onChange={event => setDraft(previous => ({ ...previous, method: event.target.value }))}>
                <option value="travel">외화 트래블카드</option>
                <option value="standard">일반 해외결제 카드</option>
                <option value="cash">현금</option>
              </select>
            </label>
          </div>
          <label>
            거래 날짜
            <input id="expense-date" type="date" required name="expense-date" value={draft.date} onChange={event => setDraft(previous => ({ ...previous, date: event.target.value }))} />
          </label>
          <button className="primary">지출 기록하기 <span>＋</span></button>
          <p id="expense-message" className="form-message" role="status">{message}</p>
        </form>
      </div>
      <div className="section-title">
        <h2>돌려받을 금액도 여행의 일부</h2>
        <small>실제 수령액은 직접 확인해 기록해 주세요</small>
      </div>
      <div className="card" id="refund-tracking">
        {refunds.length ? refunds.map(item => <div className="refund-track-row" key={item.id}><div><b>{item.name}</b><p>{item.refundPlace} · {item.refundReceive}<br />{item.instantDiscount ? '차감된 구매금액을 지출에 반영했어요.' : '예정 ' + won(item.expectedRefund) + (item.actualRefund != null ? ' · 실제 차이 ' + won(item.actualRefund - item.expectedRefund) : '')}</p></div><div className="track-money"><strong>{won(item.instantDiscount || (item.actualRefund ?? item.expectedRefund))}</strong><span className={'badge ' + (item.actualRefund != null ? '' : 'peach')}>{item.instantDiscount ? '매장 차감 반영' : item.actualRefund != null ? '수령 기록 완료' : '환급 예정'}</span> <button hidden={!!item.instantDiscount} data-actual={item.id} onClick={() => openRefund(item)}>{item.actualRefund != null ? '수령액 수정' : '수령액 기록'} ↗</button></div></div>) : <p className="empty">택스 리펀드에서 영수증을 연결하면<br />예정액과 실제 환급 내역을 함께 볼 수 있어요.</p>}
      </div>
      <div className="section-title">
        <h2>나의 거래 내역</h2>
        <div className="filters" role="group" aria-label="거래 필터">
          <button data-filter="all" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button>
          <button data-filter="purchase" className={filter === 'purchase' ? 'active' : ''} onClick={() => setFilter('purchase')}>지출</button>
          <button data-filter="transfer" className={filter === 'transfer' ? 'active' : ''} onClick={() => setFilter('transfer')}>충전 · 인출</button>
        </div>
      </div>
      <div className="card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  거래 정보
                </th>
                <th>
                  분류
                </th>
                <th>
                  결제 수단
                </th>
                <th>
                  현지 금액
                </th>
                <th>
                  원화 비용
                </th>
                <th>
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody id="expenses">
              {filtered.length ? [...filtered].reverse().map(item => <tr key={item.id}><td><b>{item.name}</b><small>{item.date} · {item.receiptGroup ? '영수증 연결' : '직접 입력 / 시연 예시'}{item.type !== 'purchase' && ' · 자금 이동'}</small></td><td>{item.type === 'purchase' ? item.category : item.type === 'atm' ? 'ATM 인출' : '외화 충전'}</td><td>{T.methodNames[item.method] || '기타'}</td><td>{foreign(item.amount, item.country)}</td><td><b>{won(item.type === 'purchase' ? item.cost : item.fee)}</b>{item.type !== 'purchase' && <small>비용만 지출에 반영</small>}</td><td><button className="delete" data-expense-delete={item.id} aria-label={item.name + ' 거래 삭제'} onClick={() => deleteExpense(item.id)}>×</button></td></tr>) : <tr><td colSpan="6" className="empty">표시할 거래가 없어요.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="report-card">
        <div className="report-icon">
          ✦
        </div>
        <div>
          <div className="eyebrow">
            YOUR TRAVEL MONEY STORY
          </div>
          <h2>여행은 추억으로, 금융은 더 똑똑하게.</h2>
          <div id="ai-report">
            <p>기록된 총비용은 <strong>{won(summary.gross)}</strong>, 실제 환급 수령액을 반영한 지출은 <strong>{won(summary.net)}</strong>이에요.{summary.pending > 0 && ` 예정된 환급까지 모두 수령한다면 ${won(summary.projected)}으로 예상돼요.`}</p><p>{summary.purchases.length > 0 && `가장 많이 사용한 카테고리는 ${topCategory}이에요. `}외화카드로 결제한 기록은 시연 현금 환전 방식보다 <strong>{won(travelSavings)}</strong> 낮게 계산됐어요.</p>
            {refunds.filter(item => item.comparison).map(item => <p key={item.id}>{item.name}은 {item.refundPlace} · {item.refundReceive} 방식으로 연결했어요.{item.comparison.store != null && item.comparison.airport != null ? <> 같은 결제 수단에서 매장 즉시환급보다 공항 카드 환급의 실지출액이 <strong>{won(item.comparison.store - item.comparison.airport)}</strong> 낮게 계산됐어요.</> : ' 확인된 환급 방식만 비교했어요.'}</p>)}
            <p>다음 여행에는 현금 사용처를 먼저 확인하고, 필요한 금액만 확보하는 방법을 비교해 보세요.</p><small>시연 조건을 사용한 계산 리포트입니다. 실제 상품 약관·환급 환율·운영사 비용이 확인되지 않은 대안의 절감액은 확정하지 않아요. 충전·인출 원금은 소비 합계에서 제외합니다.</small>
          </div>
        </div>
      </div>
    </section>
    <dialog id="refund-dialog" aria-labelledby="refund-dialog-title" ref={dialog}>
      <div className="card-head">
        <h2 id="refund-dialog-title">실제 환급 수령 기록</h2>
        <button className="dialog-close" id="refund-dialog-close" aria-label="닫기" onClick={() => dialog.current.close()}>×</button>
      </div>
      <form id="actual-refund-form" onSubmit={submitRefund}>
        <label>
          실제로 수령한 원화 금액
          <input id="actual-refund" type="number" min="0" max="1000000000" step="1" required name="actual-refund" value={actualAmount} onChange={event => setActualAmount(event.target.value)} />
        </label>
        <p className="subtle-note">카드 이용내역 등에서 확인한 금액을 입력해 주세요. 환급 완료 후에는 예정액 대신 실제액을 리포트에 반영해요.</p>
        <button className="primary">수령 내역 저장 <span>✓</span></button>
      </form>
    </dialog>
  </>;
}
