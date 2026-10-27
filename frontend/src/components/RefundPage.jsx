import { useEffect, useMemo, useRef, useState } from 'react';
import * as T from '../utils/core.js';
import { createId, foreign, won } from '../utils/format.js';
import useFilePreview from '../hooks/useFilePreview.js';
import { errorText, postJSON, recognizeReceipt, todayISO } from '../utils/refundApi.js';
import RefundProgress, { optionNames, statusTone } from './RefundProgress.jsx';

const emptyDraft = trip => ({ store: '파리 백화점 · 예시', date: trip.depart, amount: 420, method: 'travel', vatNumber: '', eligible: true, instant: true, city: false });
const period = group => group.startDate === group.endDate ? group.startDate : group.startDate + ' ~ ' + group.endDate.slice(5);
const images = /^image\/(jpeg|png|webp)$/;

// 3페이지: 묶음 · 알림 · 기한 · 상태 · 보여 줄 조합은 서버(/api/refunds/tracker)가 계산하고 화면은 결과만 그린다 (R26~R28, R32, R52, R53)
export default function RefundPage({ state, setState, hidden, notify }) {
  const [draft, setDraft] = useState(() => emptyDraft(state.trip));
  const [message, setMessage] = useState('');
  const [tracker, setTracker] = useState({ groups: [], error: '', loading: true });
  const [reading, setReading] = useState(false);
  const [filled, setFilled] = useState([]);
  const latestPhoto = useRef(0);
  const preview = useFilePreview(notify);
  const today = state.taxToday || todayISO();
  const notFrance = state.trip.country !== 'FR';

  const request = useMemo(() => ({
    receipts: state.receipts.map(r => ({ id: r.id, store: r.store, date: r.date, amount: r.amount, method: r.method,
      vatNumber: r.vatNumber || '', eligible: r.eligible, instant: r.instant, city: r.city })),
    bves: state.bves, confirmations: state.confirmations, today,
    received: state.expenses.filter(e => e.receiptGroup && e.actualRefund != null && e.refundChoice !== 'store').map(e => e.receiptGroup),
  }), [state.receipts, state.bves, state.confirmations, state.expenses, today]);
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    let alive = true;
    postJSON('/api/refunds/tracker', JSON.parse(requestKey))
      .then(data => alive && setTracker({ groups: data.map(g => ({ ...g, date: g.startDate, amount: Number(g.amount), docs: true, country: 'FR' })), error: '', loading: false }))
      .catch(error => alive && setTracker({ groups: [], error: error.message, loading: false }));
    return () => { alive = false; };
  }, [requestKey]);

  const groups = tracker.groups;
  const group = groups.find(item => item.ids.includes(state.selected)) || groups[0];
  const bve = group && state.bves[group.key];
  const options = group ? T.refundOptions(group) : [];
  // BVE가 있으면 선택은 서류의 수령 방식으로 고정된다 (R33)
  const selected = group && (T.refundOptions(group.bveMethod ? { ...group, instant: true, city: true } : group)
    .find(item => item.id === (group.bveMethod || state.choices[group.key])) || options[0]);
  const rows = group?.rows || [];
  const best = rows[0];
  const waiting = state.trip.return <= today && groups.some(item => item.status === 'CUSTOMS_NEEDED');
  const early = ['store', 'city'].includes(selected?.id);
  const places = [['airport-card', '공항 · 카드 환급'], ['store', '매장 즉시환급'], ['airport-cash', '공항 · 현금 환급'], ...(group?.city ? [['city', '시내 · 카드 환급']] : [])];
  const dday = !group ? '기한은 영수증을 등록하면 표시돼요'
    : early && !bve ? `반송 기한(환급일 + 21일)과 세관 기한 ${group.customsDeadline} 중 이른 날 D-day`
    : (early ? '실제 기한 ' + group.effectiveDeadline : '세관 확인 기한 ' + group.customsDeadline) + ' D-day';
  // 출국 체크리스트 (R36): 짐 부치기 전 키오스크 → 초록 / 빨간 화면 분기 → 보안검색
  const steps = [
    { title: '매장에서', items: ['여권을 보여 주세요', '택스리펀 서류(PABLO 바코드) 요청', '환급 수령 방식 확인', ...(early ? ['선환급이면 카드 보증 (본인 명의, 6개월 이상 유효)'] : [])] },
    { title: '출국 전', items: ['물건은 쓰지 말고 포장 그대로', '서류와 여권 챙기기', dday] },
    { title: '최종 EU 출국 시', ordered: state.exitCountry === 'FR', items: state.exitCountry === 'FR'
      ? ['체크인 · 짐 부치기 전에 PABLO 키오스크에서 바코드 스캔', '초록 화면이면 완료 (화면 캡처 권장)', '빨간 화면 · 고장 · 바코드 없음 → 세관 창구 도장 → 서류를 사업자 봉투로 우편함 투함', '그다음 보안검색 (통과하면 되돌아올 수 없어요)']
      : ['그 나라 세관 도장 받기', '서류 출력본 챙기기', '프랑스에서 자동으로 완료되지 않아요', '판매자가 6개월 안에 전표를 받아야 환급돼요'] },
  ];
  const change = key => event => setDraft(previous => ({ ...previous, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const filledClass = id => filled.includes(id) ? 'ocr-filled' : undefined;

  // 영수증 사진을 고르면 서버(Claude)로 읽어 입력칸 초안을 채운다 (R51). 다른 사진을 고르면 이전 결과는 버린다
  async function selectPhoto(event) {
    const file = event.target.files[0];
    preview.selectFile(event);
    if (!file || !images.test(file.type) || file.size > 10 * 1024 * 1024) return; // PDF는 미리보기만
    const requestId = ++latestPhoto.current;
    setReading(true);
    setFilled([]);
    setMessage('사진을 읽는 중이에요…');
    try {
      const data = await recognizeReceipt(file);
      if (requestId !== latestPhoto.current) return;
      const fields = [['store', 'store', '매장명'], ['date', 'purchase-date', '구매일'], ['amount', 'purchase-amount', '금액'], ['method', 'purchase-method', '결제 수단']]
        .filter(([key]) => data[key] != null && data[key] !== '');
      setDraft(previous => ({ ...previous, ...Object.fromEntries(fields.map(([key]) => [key, data[key]])) }));
      setFilled(fields.map(([, id]) => id));
      setMessage(fields.length
        ? `사진에서 ${fields.map(([, , label]) => label).join(' · ')}을(를) 채웠어요. 내용을 확인하고 결제 수단 · VAT · 자격 항목을 고른 뒤 등록해 주세요.`
        : '사진에서 읽은 항목이 없어요. 영수증 정보를 직접 입력해 주세요.');
    } catch (error) {
      if (requestId !== latestPhoto.current) return;
      setMessage(error.message);
    } finally {
      if (requestId === latestPhoto.current) setReading(false);
    }
  }

  useEffect(() => {
    if (!filled.length) return;
    const timer = setTimeout(() => setFilled([]), 2400);
    return () => clearTimeout(timer);
  }, [filled]);

  function submitReceipt(event) {
    event.preventDefault();
    if (notFrance) return;
    const store = draft.store.trim();
    if (!store) { setMessage('매장명을 입력해 주세요.'); return; }
    const vatNumber = draft.vatNumber.replace(/\s+/g, '').toUpperCase();
    if (vatNumber && !/^FR[0-9A-Z]{2}[0-9]{9}$/.test(vatNumber)) { setMessage(errorText.INVALID_VAT); return; }
    const receipt = { id: createId(), store, date: draft.date, amount: Number(draft.amount), method: draft.method, vatNumber: vatNumber || null,
      eligible: draft.eligible, instant: draft.instant, city: draft.city, country: 'FR' };
    if (state.receipts.some(item => item.store.normalize('NFC').trim().toLowerCase() === store.normalize('NFC').toLowerCase() && item.date === receipt.date && item.amount === receipt.amount)) {
      setMessage('같은 매장·날짜·금액의 영수증이 있어요. 중복 여부를 확인해 주세요.'); return;
    }
    setState(previous => ({ ...previous, receipts: [...previous.receipts, receipt], selected: receipt.id }));
    // 다음 영수증을 바로 넣을 수 있게 입력칸을 비운다
    setDraft(previous => ({ ...previous, store: '', amount: '', date: '', vatNumber: '' }));
    setMessage('입력한 거래를 등록했어요. 같은 매장(VAT 번호)·3일 안의 영수증은 합산됩니다.');
    notify('영수증과 환급 비교를 업데이트했어요.');
  }

  function deleteGroup(target) {
    setState(previous => {
      const choices = { ...previous.choices }, bves = { ...previous.bves }, confirmations = { ...previous.confirmations };
      delete choices[target.key]; delete bves[target.key]; delete confirmations[target.key];
      return { ...previous, choices, bves, confirmations, selected: target.ids.includes(previous.selected) ? null : previous.selected,
        receipts: previous.receipts.filter(item => !target.ids.includes(item.id)) };
    });
    notify('영수증을 삭제했어요. 이미 연결한 가계부 거래는 유지돼요.');
  }

  // 가계부 연결 (R34): BVE가 있으면 서류 예정 원화를 환급 예정 · 즉시 차감으로 쓴다
  function linkReceipt() {
    if (!group || !selected || group.method === 'mixed') return;
    const existing = state.expenses.find(item => item.receiptGroup === group.key || item.receiptIds?.some(identity => group.ids.includes(identity)));
    if (existing) { notify('이미 연결한 구매예요. 중복 거래를 추가하지 않았어요.'); return; }
    const all = T.combinations(bve ? { ...group, instant: true, city: true } : group, T.countries.FR.rate);
    const refundEuro = bve ? Number(bve.amount) : selected.refund;
    const same = state.expenses.find(item => item.type === 'purchase' && item.country === 'FR' && item.name.normalize('NFC').trim().toLowerCase() === group.store.normalize('NFC').trim().toLowerCase() && item.date === group.date && item.amount === group.amount);
    let row = all.find(item => item.method === group.method && item.id === selected.id);
    if (!row) return;
    if (bve && group.bveKRW != null) row = { ...row, refundKRW: group.bveKRW, net: row.gross - group.bveKRW };
    const instant = row.id === 'store';
    const data = { amount: instant ? T.round(group.amount - refundEuro) : group.amount, originalAmount: group.amount,
      receiptGroup: group.key, receiptIds: [...group.ids], expectedRefund: instant ? 0 : row.refundKRW,
      refundPlace: row.place, refundReceive: row.receive, actualRefund: instant ? 0 : null,
      instantDiscount: instant ? row.refundKRW : 0, refundChoice: row.id, refundBasis: bve ? '확인됨' : '추정',
      comparison: { chosen: row.net, best: all[0].net, store: all.find(item => item.method === group.method && item.id === 'store')?.net, airport: all.find(item => item.method === group.method && item.id === 'airport-card')?.net } };
    const instantCosts = { cost: row.net, fee: Math.max(0, row.net - Math.round((group.amount - refundEuro) * 1580)) };
    setState(previous => ({ ...previous, expenses: same
      ? previous.expenses.map(item => item.id === same.id ? { ...item, ...data, ...(instant ? instantCosts : {}) } : item)
      : [...previous.expenses, { id: createId(), name: group.store, date: group.date, country: 'FR', rate: 1580,
          method: group.method, type: 'purchase', category: '쇼핑', cost: instant ? row.net : row.gross,
          fee: instant ? instantCosts.fee : row.gross - Math.round(group.amount * 1580), ...data }] }));
    notify(same ? '일치하는 수동 거래에 환급 정보를 연결했어요.' : bve ? '서류 금액(확인됨)으로 가계부에 연결했어요.' : '영수증과 환급 예정액을 가계부에 연결했어요.');
  }

  return <>
    <section className="page" id="tax" hidden={hidden} aria-labelledby="tax-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            A LITTLE SOMETHING BACK
          </div>
          <h1 id="tax-title">쇼핑의 기쁨, 돌려받는 순간까지.</h1>
          <p>영수증 한 장으로 서류 · 세관 확인 · 입금까지 놓치지 않게 챙겨요.</p>
        </div>
        <span className="outline-tag">03 / TAX REFUND</span>
      </div>
      <div className="demo-notice">
        <span>ⓘ</span>
        <p>프랑스 환급 시연입니다. 10~12% 환급률은 계산 가정(추정)이며, 환급 서류(BVE)를 등록하면 서류 금액(확인됨)으로 계산해요. 세관 · 사업자 처리는 자동 확인되지 않아요.</p>
      </div>
      <p id="tax-country-note" className="form-message" role="status">{notFrance ? '현재 여행 국가의 환급 규칙은 준비 중이에요. 아래는 기존 프랑스 영수증의 별도 시연이며 신규 등록은 프랑스로 설정 후 이용해 주세요.' : ''}</p>
      <div className="section-title">
        <h2>환급은 이 순서로 진행돼요</h2>
        <a href="https://www.douane.gouv.fr/en/fiche/tax-exemption-france-tourists-pablo" target="_blank" rel="noopener noreferrer" className="text-link">프랑스 세관 공식 안내 ↗</a>
      </div>
      <div className="card route-top" id="refund-route">
        <div className="route-top-head">
          <h3>나의 출국 경로</h3>
          <div className="two">
            <label>
              출국 공항
              <input id="exit-airport" maxLength="80" name="exit-airport" value={state.exitAirport} onChange={event => setState(previous => ({ ...previous, exitAirport: event.target.value }))} />
            </label>
            <label>
              EU 최종 출국 국가
              <select id="eu-exit" name="eu-exit" value={state.exitCountry} onChange={event => setState(previous => ({ ...previous, exitCountry: event.target.value }))}>
                <option value="FR">프랑스</option>
                <option value="other">다른 EU 국가에서 최종 출국</option>
              </select>
            </label>
          </div>
        </div>
        <p id="exit-guide" className="route-guide">{state.exitCountry === 'FR' ? `${state.exitAirport || '출국 공항'}에서 EU를 최종 출국한다면, 체크인 · 짐 부치기 전에 PABLO 키오스크부터 들르세요. 세부 위치는 공식 공항·세관 안내로 확인해 주세요.` : '다른 EU 국가에서 최종 출국한다면 그 국가의 세관 도장이 필요하고 서류 출력본을 챙겨야 해요. 프랑스 공항에서 자동 완료된다고 가정하지 마세요.'}</p>
        <ol id="refund-checklist" className="route-flow">
          {steps.map((step, index) => {
            const items = step.items.map(item => <li key={item}>{item}</li>);
            return <li className={'route-flow-step' + (index === steps.length - 1 ? ' key' : '')} key={step.title}>
              <span className="num">{index + 1}</span>
              <h4>{step.title}</h4>
              {step.ordered ? <ol>{items}</ol> : <ul>{items}</ul>}
            </li>;
          })}
        </ol>
      </div>
      <div className="tax-layout">
        <form className={'card' + (reading ? ' ocr-reading' : '')} id="tax-form" onSubmit={submitReceipt} aria-busy={reading}>
          <div className="card-head">
            <div>
              <h3>영수증 & 환급서류</h3>
              <p>파일을 첨부하고 거래 정보를 확인해 주세요.</p>
            </div>
            <button className="text-button" type="button" id="load-receipt-demo" disabled={reading} onClick={() => { setDraft(emptyDraft(state.trip)); setMessage('예시 데이터를 불러왔어요. 실제 영수증을 분석한 결과가 아닙니다.'); }}>예시 불러오기 ↗</button>
          </div>
          <label className="upload-zone" htmlFor="receipt-file">
            <span>↥</span>
            <b id="receipt-file-label">{preview.name || '영수증 이미지 또는 PDF 첨부'}</b>
            <small>사진은 Claude로 전송돼 인식돼요 · 결과를 꼭 확인해 주세요</small>
            <input id="receipt-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" name="receipt-file" onChange={selectPhoto} />
          </label>
          <img id="receipt-preview" className="receipt-preview" alt="선택한 영수증 미리보기" hidden={!preview.url} src={preview.url || undefined} />
          <fieldset disabled={reading}>
            <label>
              매장명
              <input id="store" className={filledClass('store')} maxLength="80" required name="store" value={draft.store} onChange={change('store')} />
            </label>
            <div className="two">
              <label>
                구매일
                <input id="purchase-date" className={filledClass('purchase-date')} type="date" required name="purchase-date" value={draft.date} onChange={change('date')} />
              </label>
              <label>
                구매 금액 (€)
                <input id="purchase-amount" className={filledClass('purchase-amount')} type="number" min="0.01" max="1000000" step="0.01" required name="purchase-amount" value={draft.amount} onChange={change('amount')} />
              </label>
            </div>
            <label>
              결제 수단
              <select id="purchase-method" className={filledClass('purchase-method')} name="purchase-method" value={draft.method} onChange={change('method')}>
                <option value="travel">외화 트래블카드</option>
                <option value="standard">일반 해외결제 카드</option>
                <option value="cash">현지 현금</option>
              </select>
            </label>
            <label>
              VAT 번호 (선택)
              <input id="vat-number" maxLength="20" placeholder="FR로 시작하는 13자리 · 영수증의 N° TVA" name="vat-number" value={draft.vatNumber} onChange={change('vatNumber')} />
            </label>
            <label className="check-row">
              <input id="tax-eligible" type="checkbox" name="tax-eligible" checked={draft.eligible} onChange={change('eligible')} />
              <span>비EU 거주・연령・체류・상품 요건을 충족한다고 가정해요</span>
            </label>
            <label className="check-row">
              <input id="instant-supported" type="checkbox" name="instant-supported" checked={draft.instant} onChange={change('instant')} />
              <span>매장 즉시환급 지원을 확인했다고 가정해요</span>
            </label>
            <label className="check-row">
              <input id="city-supported" type="checkbox" name="city-supported" checked={draft.city} onChange={change('city')} />
              <span>시내 환급 창구 지원을 확인했다고 가정해요</span>
            </label>
            <button className="primary" disabled={notFrance}>거래 확인 후 영수증 등록 <span>＋</span></button>
          </fieldset>
          <p id="receipt-message" className={'form-message' + (reading ? ' ocr-status' : '')} role="status">{group?.method === 'mixed' && !message ? '서로 다른 결제 수단이 섞인 묶음은 가계부 자동 연결을 지원하지 않아요. 거래별로 직접 기록해 주세요.' : message}</p>
        </form>
        <div>
          <div className="card receipt-list-card">
            <div className="card-head">
              <div>
                <h3>나의 영수증</h3>
                <p>같은 매장(VAT 번호)・3일 안의 구매는 하나로 합산해요.</p>
              </div>
              <span id="receipt-count" className="count-tag">{state.receipts.length}</span>
            </div>
            {waiting && <div id="tracker-banner" className="tracker-banner" role="status">PABLO 초록 화면을 봤나요? 세관 확인이 필요한 구매가 있어요. "선택한 구매의 환급 진행"에서 세관 확인을 표시해 주세요.</div>}
            <label className="today-row">상태 기준일 (시연용)<input id="tax-today" type="date" value={today} onChange={event => setState(previous => ({ ...previous, taxToday: event.target.value || null }))} /></label>
            <div id="receipts">
              {tracker.error ? <div className="empty">{tracker.error}</div>
                : groups.length ? groups.map(item => <div className={'receipt-row ' + (item.key === group?.key ? 'selected' : '')} key={item.key}>
                  <button className="receipt-select" data-select={item.ids[0]} aria-pressed={item.key === group?.key} onClick={() => setState(previous => ({ ...previous, selected: item.ids[0] }))}><div><b>{item.store}</b><strong>{foreign(item.amount)}</strong></div><p>{period(item)} · {item.ids.length}개 영수증 합산{item.vatNumber ? ' · VAT ' + item.vatNumber : ''}</p><span className={'badge ' + statusTone[item.status]}>{item.statusLabel}</span></button>
                  <button className="receipt-delete" data-receipt-delete={item.ids[0]} aria-label={item.store + ' 영수증 묶음 삭제'} onClick={() => deleteGroup(item)}>×</button>
                </div>)
                : state.receipts.length && tracker.loading ? <div className="empty">환급 상태를 불러오는 중이에요…</div>
                : <div className="empty"><span className="empty-icon">▤</span>아직 등록한 영수증이 없어요.<br />예시를 불러오거나 거래 정보를 입력해 보세요.</div>}
            </div>
          </div>
          <div className="refund-highlight" id="refund-overview">
            {best ? <><div className="eyebrow">MAKE YOUR SHOPPING GO FURTHER</div><h3>결제부터 환급까지,<br />놓치지 않고 비교했어요.</h3><p>{bve ? '서류 기준 실지출액' : '이 결제 수단의 최소 실지출액'} {won(best.net)}<br />예상 환급액 · {best.label}</p><strong>{won(best.refundKRW)}</strong><small>{T.methodNames[best.method]} + {optionNames[best.id]} / 프랑스 시연 환율 기준</small></> : <><div className="eyebrow">READY FOR A LITTLE BACK?</div><h3>영수증과 환급서류를<br />함께 준비해 주세요.</h3><p>금액만으로 환급을 보장하지 않아요.<br />자격·금액 조건이 맞는 구매만 비교합니다.</p></>}
          </div>
        </div>
      </div>
      <RefundProgress group={group} state={state} setState={setState} today={today} defaultMethod={selected?.id} notify={notify} />
      <div className="section-title">
        <h2>어디에서, 언제 돌려받을까요?<span>01</span></h2>
        <span id="active-receipt" className="muted-tag">{group ? group.store + ' · ' + period(group) : '영수증을 등록해 주세요'}</span>
      </div>
      <div id="refund-options" className="refund-options">
        {!group || (!options.length && !bve) ? <div className="card empty" style={{ gridColumn: '1/-1' }}>{!group ? '영수증을 등록하면 환급 장소와 수령 방식을 비교할 수 있어요.' : group.reasons?.length ? group.reasons.join(' · ') + '이 필요해요. 같은 매장 3일 합계가 €100을 넘는지, 자격 요건을 확인해 주세요.' : '환급 조건을 확인해 주세요.'}</div> : places.map(([key, label]) => {
          const option = options.find(item => item.id === key);
          if (group.bveMethod === key) return <div className="refund-option active" key={key}><span className="badge done">확인됨 · 서류 등록</span><h3>{label}</h3><strong>{foreign(bve.amount)}</strong><p>{bve.operator}{bve.number ? ' · ' + bve.number : ''}</p><small>서류 금액으로 계산 중이에요.</small></div>;
          return option ? <button key={key} className={'refund-option ' + (!group.bveMethod && selected?.id === key ? 'active' : '')} data-refund={key} aria-pressed={!group.bveMethod && selected?.id === key} disabled={!!group.bveMethod} onClick={() => setState(previous => ({ ...previous, choices: { ...previous.choices, [group.key]: key } }))}><span className="badge neutral">추정</span><h3>{label}</h3><strong>{foreign(option.refund)}</strong><p>{option.timing}</p><small>{option.time}</small></button> : <div className="refund-option disabled" key={key}><span className="badge neutral">확인 필요</span><h3>{label}</h3><strong>—</strong><p>매장의 지원 여부가 확인되지 않아<br />비교에서 제외했어요.</p><small>등록 시 지원 조건을 확인해 주세요.</small></div>;
        })}
      </div>
      <div className="section-title">
        <h2>환급까지 반영한 최종 결제비용<span>02</span></h2>
        <span className="muted-tag">이미 결제한 수단 × 환급 시점 × 수령 방식</span>
      </div>
      <div className="card">
        <div id="optimization-summary">
          {best && <div className="optimization-banner"><p><span className="badge">{best.label}</span><br /><b>{T.methodNames[best.method]} + {optionNames[best.id]}</b><br />{bve ? '등록한 서류 금액으로 확정한 실지출액이에요.' : rows.length > 1 ? `이미 결제한 수단 기준으로 가장 비용이 큰 방법보다 ${won(rows.at(-1).net - best.net)} 낮아요. ${group.rowsNote || ''}` : ''}</p><strong>{won(best.net)}</strong></div>}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>결제 수단</th>
                <th>환급 장소 · 수령</th>
                <th>결제 원화 비용</th>
                <th>예상 환급액</th>
                <th>최종 실지출액</th>
                <th>표시</th>
              </tr>
            </thead>
            <tbody id="optimization-table">
              {rows.length ? rows.map((item, index) => <tr key={item.method + item.id} className={index === 0 ? 'best-row' : ''}><td><b>{T.methodNames[item.method]}</b>{index === 0 && <span className="badge">최저</span>}</td><td>{optionNames[item.id]}</td><td>{won(item.gross)}</td><td>−{won(item.refundKRW)}</td><td><b>{won(item.net)}</b></td><td><span className={'badge ' + (item.label === '확인됨' ? 'done' : 'neutral')}>{item.label}</span></td></tr>) : <tr><td colSpan="6" className="empty">확인 가능한 영수증의 환급 조건이 필요해요.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="table-note">계산식: 결제금액 × 결제환율 + 결제수수료 − (수수료 차감 후 환급금 × 환급환율). 실제 환급 시 환율에 따라 달라질 수 있어요.</p>
        <details className="assumptions">
          <summary>
            시연 계산 조건 확인하기
          </summary>
          <p id="refund-assumptions">프랑스 전용: 기준환율 €1 = 1,580원. 트래블카드 결제 비용 0%, 일반 카드 1.3%, 현금 환전 가산율 2%. 매장 즉시환급 10%(구매 시 차감), 공항 카드 12%(환급환율은 기준의 99.5%), 공항 현금 10.5% − €3(환급환율 98%), 시내 카드 11% − €2(99.5%). 환급률은 VAT 세율이 아닌 수수료 차감 후 시연 비율(추정)이며, 서류를 등록하면 서류 금액(확인됨)을 씁니다. 등록한 영수증은 이미 결제한 수단의 행만 보여 줘요. 실제 지원·소요기간을 보장하지 않아요.</p>
        </details>
      </div>
      <div className="section-title">
        <h2>환급을 놓치지 않는 여행의 마무리<span>03</span></h2>
      </div>
      <div className="route-grid single">
        <div className="card">
          <div className="card-head">
            <h3>환급금도 끝까지 확인해요</h3>
            <span className="woori-dot">W</span>
          </div>
          <p className="body-copy">선택한 구매를 가계부에 연결하면 환급 예정액과 실제 수령액을 비교할 수 있어요.</p>
          <div className="soft-note">
            우리카드 환급은 사업자의 지원・카드 매칭 여부 확인이 필요해요. 외화계좌 수취 및 자동 입금은 연결되지 않았어요.
          </div>
          <button className="primary" id="link-receipt" type="button" disabled={!group || !selected || group.method === 'mixed'} onClick={linkReceipt}>선택 구매를 가계부에 연결 <span>→</span></button>
        </div>
      </div>
    </section>
  </>;
}
