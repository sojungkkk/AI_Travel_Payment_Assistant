import { useState } from 'react';
import * as T from '../utils/core.js';
import { createId, foreign, won } from '../utils/format.js';
import useFilePreview from '../hooks/useFilePreview.js';

export default function RefundPage({ state, setState, hidden, notify }) {
  const [draft, setDraft] = useState({ store: '파리 백화점 · 예시', date: state.trip.depart, amount: 420, method: 'travel', docs: 'yes', eligible: true, instant: true, city: false });
  const [message, setMessage] = useState('');
  const preview = useFilePreview(notify);
  const groups = T.groupReceipts(state.receipts);
  const group = groups.find(item => item.ids.includes(state.selected)) || groups[0];
  const options = T.refundOptions(group);
  const combinations = T.combinations(group, T.countries.FR.rate);
  const best = combinations[0];
  const selected = options.find(item => item.id === state.choices[group?.key]) || options[0];
  const notFrance = state.trip.country !== 'FR';
  const places = [['airport-card', '공항 · 카드 환급'], ['store', '매장 즉시환급'], ['airport-cash', '공항 · 현금 환급'], ...(group?.city ? [['city', '시내 · 카드 환급']] : [])];
  const steps = [
    ['매장에서', '여권·거주 요건을 확인하고 환급서류를 발급받으세요.'],
    ['출국 전', selected?.id === 'store' ? '즉시환급을 받아도 사후 세관 확인 조건과 마감일을 확인하세요.' : '구매품·여권·환급서류를 함께 준비하고 신청 조건을 확인하세요.'],
    ['최종 EU 출국 시', '세관 확인 후 선택한 사업자의 제출·수령 절차를 진행하세요.'],
  ];

  function submitReceipt(event) {
    event.preventDefault();
    if (notFrance) return;
    const store = draft.store.trim();
    if (!store) { setMessage('매장명을 입력해 주세요.'); return; }
    const receipt = { ...draft, id: createId(), store, amount: Number(draft.amount), docs: draft.docs === 'yes', country: 'FR' };
    if (state.receipts.some(item => item.store.normalize('NFC').trim().toLowerCase() === store.normalize('NFC').toLowerCase() && item.date === receipt.date && item.amount === receipt.amount)) {
      setMessage('같은 매장·날짜·금액의 영수증이 있어요. 중복 여부를 확인해 주세요.'); return;
    }
    setState(previous => ({ ...previous, receipts: [...previous.receipts, receipt], selected: receipt.id }));
    setMessage('입력한 거래를 등록했어요. 같은 매장·같은 날의 영수증은 합산됩니다.');
    notify('영수증과 환급 비교를 업데이트했어요.');
  }

  function deleteGroup(target) {
    setState(previous => {
      const choices = { ...previous.choices };
      delete choices[target.key];
      return { ...previous, choices, selected: target.ids.includes(previous.selected) ? null : previous.selected,
        receipts: previous.receipts.filter(item => !target.ids.includes(item.id)) };
    });
    notify('영수증을 삭제했어요. 이미 연결한 가계부 거래는 유지돼요.');
  }

  function linkReceipt() {
    if (!group || !selected || group.method === 'mixed') return;
    const existing = state.expenses.find(item => item.receiptGroup === group.key || item.receiptIds?.some(identity => group.ids.includes(identity)));
    if (existing) { notify('이미 연결한 구매예요. 중복 거래를 추가하지 않았어요.'); return; }
    const same = state.expenses.find(item => item.type === 'purchase' && item.country === 'FR' && item.name.normalize('NFC').trim().toLowerCase() === group.store.normalize('NFC').trim().toLowerCase() && item.date === group.date && item.amount === group.amount);
    const row = combinations.find(item => item.method === group.method && item.id === selected.id);
    if (!row) return;
    const instant = row.id === 'store';
    const data = { amount: instant ? T.round(group.amount - selected.refund) : group.amount, originalAmount: group.amount,
      receiptGroup: group.key, receiptIds: [...group.ids], expectedRefund: instant ? 0 : row.refundKRW,
      refundPlace: row.place, refundReceive: row.receive, actualRefund: instant ? 0 : null,
      instantDiscount: instant ? row.refundKRW : 0, refundChoice: row.id,
      comparison: { chosen: row.net, best: best.net, store: combinations.find(item => item.method === group.method && item.id === 'store')?.net, airport: combinations.find(item => item.method === group.method && item.id === 'airport-card')?.net } };
    const instantCosts = { cost: row.net, fee: Math.max(0, row.net - Math.round((group.amount - selected.refund) * 1580)) };
    setState(previous => ({ ...previous, expenses: same
      ? previous.expenses.map(item => item.id === same.id ? { ...item, ...data, ...(instant ? instantCosts : {}) } : item)
      : [...previous.expenses, { id: createId(), name: group.store, date: group.date, country: 'FR', rate: 1580,
          method: group.method, type: 'purchase', category: '쇼핑', cost: instant ? row.net : row.gross,
          fee: instant ? instantCosts.fee : row.gross - Math.round(group.amount * 1580), ...data }] }));
    notify(same ? '일치하는 수동 거래에 환급 정보를 연결했어요.' : '영수증과 환급 예정액을 가계부에 연결했어요.');
  }

  return <>
    <section className="page" id="tax" hidden={hidden} aria-labelledby="tax-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            A LITTLE SOMETHING BACK
          </div>
          <h1 id="tax-title">쇼핑의 기쁨, 돌려받는 순간까지.</h1>
          <p>영수증 한 장으로 환급 준비와 최종 실지출액을 함께 확인해요.</p>
        </div>
        <span className="outline-tag">03 / TAX REFUND</span>
      </div>
      <div className="demo-notice">
        <span>ⓘ</span>
        <p>프랑스 환급 시연입니다. 10~12% 환급률과 비용은 계산 가정이며 실제 적격 판정·OCR·카드 환급은 연결되지 않았어요.</p>
      </div>
      <p id="tax-country-note" className="form-message" role="status">{notFrance ? '현재 여행 국가의 환급 규칙은 준비 중이에요. 아래는 기존 프랑스 영수증의 별도 시연이며 신규 등록은 프랑스로 설정 후 이용해 주세요.' : ''}</p>
      <div className="tax-layout">
        <form className="card" id="tax-form" onSubmit={submitReceipt}>
          <div className="card-head">
            <div>
              <h3>영수증 & 환급서류</h3>
              <p>파일을 첨부하고 거래 정보를 확인해 주세요.</p>
            </div>
            <button className="text-button" type="button" id="load-receipt-demo" onClick={() => { setDraft(previous => ({ ...previous, store: '파리 백화점 · 예시', amount: 420, date: state.trip.depart, docs: 'yes', eligible: true, instant: true, city: false })); setMessage('예시 데이터를 불러왔어요. 실제 영수증을 분석한 결과가 아닙니다.'); }}>예시 불러오기 ↗</button>
          </div>
          <label className="upload-zone" htmlFor="receipt-file">
            <span>↥</span>
            <b id="receipt-file-label">{preview.name || '영수증 이미지 또는 PDF 첨부'}</b>
            <small>사진 미리보기 지원 · 자동 인식 미연결</small>
            <input id="receipt-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" name="receipt-file" onChange={preview.selectFile} />
          </label>
          <img id="receipt-preview" className="receipt-preview" alt="선택한 영수증 미리보기" hidden={!preview.url} src={preview.url || undefined} />
          <label>
            매장명
            <input id="store" maxLength="80" required name="store" value={draft.store} onChange={event => setDraft(previous => ({ ...previous, store: event.target.value }))} />
          </label>
          <div className="two">
            <label>
              구매일
              <input id="purchase-date" type="date" required name="purchase-date" value={draft.date} onChange={event => setDraft(previous => ({ ...previous, date: event.target.value }))} />
            </label>
            <label>
              구매 금액 (€)
              <input id="purchase-amount" type="number" min="0.01" max="1000000" step="0.01" required name="purchase-amount" value={draft.amount} onChange={event => setDraft(previous => ({ ...previous, amount: event.target.value }))} />
            </label>
          </div>
          <label>
            결제 수단
            <select id="purchase-method" name="purchase-method" value={draft.method} onChange={event => setDraft(previous => ({ ...previous, method: event.target.value }))}>
              <option value="travel">외화 트래블카드</option>
              <option value="standard">일반 해외결제 카드</option>
              <option value="cash">현지 현금</option>
            </select>
          </label>
          <label>
            환급서류 발급
            <select id="refund-doc" name="refund-doc" value={draft.docs} onChange={event => setDraft(previous => ({ ...previous, docs: event.target.value }))}>
              <option value="yes">발급받았다고 가정</option>
              <option value="no">미발급 / 확인 필요</option>
            </select>
          </label>
          <label className="check-row">
            <input id="tax-eligible" type="checkbox" name="tax-eligible" checked={draft.eligible} onChange={event => setDraft(previous => ({ ...previous, eligible: event.target.checked }))} />
            <span>비EU 거주・연령・체류・상품 요건을 충족한다고 가정해요</span>
          </label>
          <label className="check-row">
            <input id="instant-supported" type="checkbox" name="instant-supported" checked={draft.instant} onChange={event => setDraft(previous => ({ ...previous, instant: event.target.checked }))} />
            <span>매장 즉시환급 지원을 확인했다고 가정해요</span>
          </label>
          <label className="check-row">
            <input id="city-supported" type="checkbox" name="city-supported" checked={draft.city} onChange={event => setDraft(previous => ({ ...previous, city: event.target.checked }))} />
            <span>시내 환급 창구 지원을 확인했다고 가정해요</span>
          </label>
          <button className="primary" disabled={notFrance}>거래 확인 후 영수증 등록 <span>＋</span></button>
          <p id="receipt-message" className="form-message" role="status">{group?.method === 'mixed' ? '서로 다른 결제 수단이 섞인 묶음은 가계부 자동 연결을 지원하지 않아요. 거래별로 직접 기록해 주세요.' : message}</p>
        </form>
        <div>
          <div className="card receipt-list-card">
            <div className="card-head">
              <div>
                <h3>나의 영수증</h3>
                <p>동일 매장・같은 날은 하나의 구매로 확인해요.</p>
              </div>
              <span id="receipt-count" className="count-tag">{state.receipts.length}</span>
            </div>
            <div id="receipts">
              {groups.length ? groups.map(item => <div className={'receipt-row ' + (item.key === group?.key ? 'selected' : '')} key={item.key}>
                <button className="receipt-select" data-select={item.ids[0]} aria-pressed={item.key === group?.key} onClick={() => setState(previous => ({ ...previous, selected: item.ids[0] }))}><div><b>{item.store}</b><strong>{foreign(item.amount)}</strong></div><p>{item.date} · {item.ids.length}개 영수증 합산</p><span className={'badge ' + (T.refundOptions(item).length ? '' : 'peach')}>{T.refundOptions(item).length ? '시연 조건 충족 · 실제 적격 확인 필요' : !item.docs ? '환급서류 발급 확인 필요' : !item.eligible ? '환급 자격 확인 필요' : '금액 조건 미충족'}</span></button>
                <button className="receipt-delete" data-receipt-delete={item.ids[0]} aria-label={item.store + ' 영수증 묶음 삭제'} onClick={() => deleteGroup(item)}>×</button>
              </div>) : <div className="empty"><span className="empty-icon">▤</span>아직 등록한 영수증이 없어요.<br />예시를 불러오거나 거래 정보를 입력해 보세요.</div>}
            </div>
          </div>
          <div className="refund-highlight" id="refund-overview">
            {best ? <><div className="eyebrow">MAKE YOUR SHOPPING GO FURTHER</div><h3>결제부터 환급까지,<br />놓치지 않고 비교했어요.</h3><p>가상 조합 중 최소 실지출액</p><strong>{won(best.net)}</strong><small>{T.methodNames[best.method]} + {best.place} · {best.receive} / 프랑스 시연 환율 기준</small></> : <><div className="eyebrow">READY FOR A LITTLE BACK?</div><h3>영수증과 환급서류를<br />함께 준비해 주세요.</h3><p>금액만으로 환급을 보장하지 않아요.<br />서류·자격·지원 방식이 확인된 시연 조건에서 비교합니다.</p></>}
          </div>
        </div>
      </div>
      <div className="section-title">
        <h2>어디에서, 언제 돌려받을까요?<span>01</span></h2>
        <span id="active-receipt" className="muted-tag">{group ? group.store + ' · ' + group.date : '영수증을 등록해 주세요'}</span>
      </div>
      <div id="refund-options" className="refund-options">
        {!options.length ? <div className="card empty" style={{ gridColumn: '1/-1' }}>{!group ? '영수증을 등록하면 환급 장소와 수령 방식을 비교할 수 있어요.' : !group.docs ? '매장에서 환급서류를 발급받았는지 먼저 확인해 주세요.' : !group.eligible ? '거주·연령·체류·상품 등 자격 조건을 먼저 확인해 주세요.' : '동일 매장·같은 날의 합계가 €100을 초과하는지 확인해 주세요.'}</div> : places.map(([key, label]) => {
          const option = options.find(item => item.id === key);
          return option ? <button key={key} className={'refund-option ' + (selected?.id === key ? 'active' : '')} data-refund={key} aria-pressed={selected?.id === key} onClick={() => setState(previous => ({ ...previous, choices: { ...previous.choices, [group.key]: key } }))}><span className={'badge ' + (key === 'airport-card' ? '' : 'neutral')}>{key === 'airport-card' ? '예시 환급액 최대' : '지원 확인 가정'}</span><h3>{label}</h3><strong>{foreign(option.refund)}</strong><p>{option.timing}</p><small>{option.time}</small></button> : <div className="refund-option disabled" key={key}><span className="badge neutral">확인 필요</span><h3>{label}</h3><strong>—</strong><p>매장의 지원 여부가 확인되지 않아<br />비교에서 제외했어요.</p><small>등록 시 지원 조건을 확인해 주세요.</small></div>;
        })}
      </div>
      <div className="section-title">
        <h2>환급까지 반영한 최종 결제비용<span>02</span></h2>
        <span className="muted-tag">결제 × 환급 시점 × 수령 방식</span>
      </div>
      <div className="card">
        <div id="optimization-summary">
          {best && <div className="optimization-banner"><p><span className="badge">가상 3수단 비교</span><br /><b>{T.methodNames[best.method]} + {best.place} · {best.receive}</b><br />가장 비용이 큰 예시 조합보다 {won(combinations.at(-1).net - best.net)} 낮아요. 보유·지원 조건을 실제로 확인해 주세요.</p><strong>{won(best.net)}</strong></div>}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  결제 수단
                </th>
                <th>
                  환급 장소 · 수령
                </th>
                <th>
                  결제 원화 비용
                </th>
                <th>
                  예상 환급액
                </th>
                <th>
                  최종 실지출액
                </th>
              </tr>
            </thead>
            <tbody id="optimization-table">
              {combinations.length ? combinations.map((item, index) => <tr key={item.method + item.id} className={index === 0 ? 'best-row' : ''}><td><b>{T.methodNames[item.method]}</b>{index === 0 && <span className="badge">최저</span>}</td><td>{item.place} · {item.receive}</td><td>{won(item.gross)}</td><td>−{won(item.refundKRW)}</td><td><b>{won(item.net)}</b></td></tr>) : <tr><td colSpan="5" className="empty">확인 가능한 영수증의 환급 조건이 필요해요.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="table-note">계산식: 결제금액 × 결제환율 + 결제수수료 − (수수료 차감 후 환급금 × 환급환율). 실제 환급 시 환율에 따라 달라질 수 있어요.</p>
        <details className="assumptions">
          <summary>
            시연 계산 조건 확인하기
          </summary>
          <p id="refund-assumptions">프랑스 전용: 기준환율 €1 = 1,580원. 트래블카드 결제 비용 0%, 일반 카드 1.3%, 현금 환전 가산율 2%. 매장 즉시환급 10%(구매 시 차감), 공항 카드 12%(환급환율은 기준의 99.5%), 공항 현금 10.5% − €3(환급환율 98%), 시내 카드 11% − €2(99.5%). 환급률은 VAT 세율이 아닌 수수료 차감 후 시연 비율입니다. 매장 즉시환급의 결제 수수료 절감분도 반영합니다. 모든 조합은 비교용 가정이며 실제 지원·소요기간을 보장하지 않아요.</p>
        </details>
      </div>
      <div className="section-title">
        <h2>환급을 놓치지 않는 여행의 마무리<span>03</span></h2>
        <a href="https://www.douane.gouv.fr/en/fiche/tax-exemption-france-tourists-pablo" target="_blank" rel="noopener noreferrer" className="text-link">프랑스 세관 공식 안내 ↗</a>
      </div>
      <div className="route-grid">
        <div className="card">
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
          <p id="exit-guide" className="subtle-note">{state.exitCountry === 'FR' ? `${state.exitAirport || '출국 공항'}에서 EU를 최종 출국하는 경우, 수하물 위탁 전에 환급서류와 구매품 확인 절차를 준비하세요. 세부 위치는 공식 공항·세관 안내로 확인해 주세요.` : '다른 EU 국가에서 최종 출국한다면 그 국가의 세관 확인 절차가 필요할 수 있어요. 프랑스 공항에서 자동 완료된다고 가정하지 마세요. 최종 출국 공항의 공식 안내를 확인해 주세요.'}</p>
          <div id="refund-checklist">
            {steps.map(([title, body], index) => <div className="route-step" key={title}><span>{index + 1}</span><div><b>{title}</b><p>{body}</p></div></div>)}
          </div>
        </div>
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
