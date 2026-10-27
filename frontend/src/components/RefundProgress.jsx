import { useState } from 'react';
import { foreign, won } from '../utils/format.js';
import { errorText, postJSON } from '../utils/refundApi.js';

export const optionNames = { 'airport-card': '공항 · 카드 환급', 'airport-cash': '공항 · 현금 환급', store: '매장 즉시환급', city: '시내 · 카드 환급' };
export const statusTone = { COMPLETED: 'done', DELAYED: 'warn', EXPIRED: 'warn', WAITING: '', CUSTOMS_NEEDED: '', DOCS_MISSING: 'peach', NOT_APPLICABLE: 'neutral' };
const knownOperators = ['Global Blue', 'Planet', '매장 직접'];

// 상태 · 기한 · 알림과 세관 확인 표시 (R27, R53, R55). 세관 · 사업자 처리는 사용자가 표시한 날짜로만 판정한다
function StatusCard({ group, bve, confirmed, today, setState, notify }) {
  const [confirm, setConfirm] = useState({ date: today, kind: 'green', mail: false });
  const [message, setMessage] = useState('');
  const dday = date => {
    const days = Math.round((new Date(date) - new Date(today)) / 86400000);
    return days >= 0 ? 'D-' + days : 'D+' + (-days);
  };
  const setConfirmation = date => setState(previous => {
    const confirmations = { ...previous.confirmations };
    if (date) confirmations[group.key] = date; else delete confirmations[group.key];
    return { ...previous, confirmations };
  });

  function save() {
    if (confirm.kind === 'red' && !confirm.mail) { setMessage('빨간 화면이면 창구 도장 후 우편함 투함까지 해야 확인으로 표시돼요. 아래 체크리스트를 확인해 주세요.'); return; }
    if (!confirm.date || confirm.date < bve.issuedOn || confirm.date > today) { setMessage(errorText.INVALID_CONFIRM_DATE); return; }
    setConfirmation(confirm.date);
    notify('세관 확인을 표시했어요. 입금 여부는 가계부에서 실제 수령액으로 기록해 주세요.');
  }

  return <div className="card" id="refund-status">
    <div className="card-head">
      <div><h3>환급 상태</h3><p>세관 · 사업자 처리는 자동 확인되지 않아요. 표시한 날짜로 판정해요.</p></div>
      <span className={'status-badge ' + statusTone[group.status]}>{group.statusLabel}</span>
    </div>
    {group.alert && <p className="status-alert">📄 {group.alert}</p>}
    {group.multiDayNote && <p className="subtle-note">{group.multiDayNote}</p>}
    {group.statusNote && <p className="status-note">{group.statusNote}</p>}
    {group.penaltyKRW > 0 && <p className="status-note">청구 예상액 {won(group.penaltyKRW)}</p>}
    <div className="deadline-row">
      <span>세관 확인 기한 <b>{group.customsDeadline}</b> {dday(group.customsDeadline)}</span>
      {group.effectiveDeadline !== group.customsDeadline && <span>실제 기한 <b>{group.effectiveDeadline}</b> {dday(group.effectiveDeadline)}</span>}
    </div>
    {bve
      ? <p className="body-copy">서류: {bve.operator} · {optionNames[bve.method]} · {foreign(bve.amount)} → <b>{won(group.bveKRW)}</b> <span className="badge done">확인됨</span></p>
      : <p className="body-copy">매장에서 받은 환급 서류를 오른쪽에 등록하면 서류 금액으로 계산하고 세관 확인을 표시할 수 있어요.</p>}
    {bve && (confirmed
      ? <div className="confirm-row"><span>세관 확인 {confirmed}</span><button className="text-button" type="button" id="confirm-cancel" onClick={() => setConfirmation(null)}>확인 취소</button></div>
      : <div className="confirm-box">
        <b>세관 확인했어요</b>
        <div className="two">
          <label>확인일<input id="confirm-date" type="date" value={confirm.date} onChange={event => setConfirm(previous => ({ ...previous, date: event.target.value }))} /></label>
          <label>키오스크 화면<select id="confirm-kind" value={confirm.kind} onChange={event => setConfirm(previous => ({ ...previous, kind: event.target.value }))}>
            <option value="green">초록 화면 (완료)</option><option value="red">빨간 화면 · 창구 도장</option>
          </select></label>
        </div>
        {confirm.kind === 'red' && <label className="check-row"><input id="confirm-mail" type="checkbox" checked={confirm.mail} onChange={event => setConfirm(previous => ({ ...previous, mail: event.target.checked }))} /><span>창구 도장을 받고 서류를 사업자 봉투로 우편함에 넣었어요</span></label>}
        <button className="primary" type="button" id="confirm-save" onClick={save}>세관 확인 표시</button>
        <p id="confirm-message" className="form-message" role="status">{message}</p>
      </div>)}
  </div>;
}

// 환급 서류(BVE) 등록 (R52). 묶음이 바뀌면 key로 다시 만들어 입력칸을 새로 채운다
function BveForm({ group, bve, defaultMethod, setState, notify }) {
  const known = !bve || knownOperators.includes(bve.operator);
  const [form, setForm] = useState({
    operator: bve ? (known ? bve.operator : '') : 'Global Blue', other: known ? '' : bve.operator,
    number: bve?.number || '', issuedOn: bve?.issuedOn || group.startDate, method: bve?.method || defaultMethod || 'airport-card',
    amount: bve?.amount ?? '', pablo: bve ? bve.pablo !== false : true,
  });
  const [message, setMessage] = useState(bve ? '등록한 서류예요. 고쳐서 다시 등록하면 덮어써요.' : '');
  const usable = group.options?.length || bve;
  const change = key => event => setForm(previous => ({ ...previous, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  async function submit(event) {
    event.preventDefault();
    const input = { operator: form.operator || form.other.trim(), number: form.number.trim() || null, issuedOn: form.issuedOn,
      pablo: form.pablo, method: form.method, amount: Number(form.amount) };
    try {
      const result = await postJSON('/api/refunds/bve', { group: { startDate: group.startDate, amount: group.amount, method: group.method }, bve: input });
      setState(previous => ({ ...previous, bves: { ...previous.bves, [group.key]: result.bve } }));
      setMessage(`서류를 등록했어요. 예정 환급 ${won(result.expectedKRW)} (확인됨)`);
      notify('환급 서류 금액으로 다시 계산했어요.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return <form className="card" id="bve-form" onSubmit={submit}>
    <fieldset disabled={!usable}>
      <div className="card-head"><div><h3>환급 서류(BVE) 등록</h3><p>매장에서 받은 서류 금액으로 바꿔 계산해요.</p></div></div>
      <div className="two">
        <label>환급사업자<select id="bve-operator" value={form.operator} onChange={change('operator')}>
          {knownOperators.map(name => <option key={name}>{name}</option>)}<option value="">기타 (직접 입력)</option>
        </select></label>
        <label>기타 사업자<input id="bve-operator-other" maxLength="40" placeholder="기타를 고른 경우" value={form.other} onChange={change('other')} /></label>
      </div>
      <div className="two">
        <label>서류번호 (선택)<input id="bve-number" maxLength="40" value={form.number} onChange={change('number')} /></label>
        <label>발행일<input id="bve-issued" type="date" required min={group.startDate} value={form.issuedOn} onChange={change('issuedOn')} /></label>
      </div>
      <div className="two">
        <label>수령 방식<select id="bve-method" value={form.method} onChange={change('method')}>
          {Object.entries(optionNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>환급 예정액 (€)<input id="bve-amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={change('amount')} /></label>
      </div>
      <label className="check-row"><input id="bve-pablo" type="checkbox" checked={form.pablo} onChange={change('pablo')} /><span>서류에 PABLO 바코드가 있어요</span></label>
      <button className="primary" type="submit">서류 등록 <span>＋</span></button>
      <p id="bve-message" className="form-message" role="status">{message}</p>
    </fieldset>
  </form>;
}

export default function RefundProgress({ group, state, setState, today, defaultMethod, notify }) {
  return <>
    <div className="section-title">
      <h2>선택한 구매의 환급 진행<span>＋</span></h2>
      <span id="status-tag" className="muted-tag">{group ? group.store : ''}</span>
    </div>
    {group
      ? <div className="progress-grid">
        <StatusCard key={group.key + today} group={group} bve={state.bves[group.key]} confirmed={state.confirmations[group.key]}
          today={today} setState={setState} notify={notify} />
        <BveForm key={group.key} group={group} bve={state.bves[group.key]} defaultMethod={defaultMethod} setState={setState} notify={notify} />
      </div>
      : <div className="card empty">영수증을 등록하면 환급 진행 상태를 보여 드려요.</div>}
  </>;
}
