import { useEffect, useRef, useState } from 'react';
import * as T from '../utils/core.js';
import { foreign, won } from '../utils/format.js';
import useFilePreview from '../hooks/useFilePreview.js';

export default function CashPage({ trip, board, cash, setCash, currentCash, hidden, setState, notify }) {
  const country = T.countries[trip.country];
  const [sort, setSort] = useState('cost');
  const [localAmount, setLocalAmount] = useState('100');
  const [prompt, setPrompt] = useState('');
  const [promptStatus, setPromptStatus] = useState('문장에서 필요한 금액을 가져와 아래 계산 조건에 반영해요.');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [boardRate, setBoardRate] = useState('');
  const [boardFee, setBoardFee] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const dialog = useRef(null), mapDetail = useRef(null);
  const preview = useFilePreview(notify);
  const best = currentCash.candidates[0];
  const saving = best ? currentCash.candidates.at(-1).cost - best.cost : 0;
  const sorted = [...currentCash.candidates].sort(sort === 'walk' ? (a, b) => a.walk - b.walk : (a, b) => a.cost - b.cost);
  const place = currentCash.candidates.find(item => item.id === selectedPlace);

  useEffect(() => {
    setPrompt(`${trip.city}에서 현금 ${trip.country === 'FR' ? 150 : trip.country === 'JP' ? 20000 : 3000}${T.countries[trip.country].currency}가 필요해. ATM과 환전소를 비교해 줘.`);
  }, [trip.city, trip.country]);

  function submitPrompt(event) {
    event.preventDefault();
    const result = T.parseCash(prompt, country);
    if (result.error) { setPromptStatus(result.error); return; }
    setCash(previous => ({ ...previous, needed: result.amount }));
    setPromptStatus('필요한 총 현금 ' + foreign(result.amount, trip.country) + '를 비교 조건에 반영했어요.');
  }

  function showPlace(identity) {
    setSelectedPlace(identity);
    requestAnimationFrame(() => mapDetail.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  function openRateDialog() {
    setBoardRate(board?.rate ?? T.round(country.rate * 1.025));
    setBoardFee(board?.fee ?? 0);
    setConfirmed(false);
    dialog.current.showModal();
  }

  function submitRate(event) {
    event.preventDefault();
    if (!confirmed) return;
    setState(previous => ({ ...previous, board: { rate: Number(boardRate), fee: Number(boardFee), country: trip.country, updatedAt: new Date().toISOString() } }));
    dialog.current.close();
    notify('직접 확인한 조건을 환전소 C에 반영했어요.');
  }

  return <>
    <section className="page" id="atm" hidden={hidden} aria-labelledby="atm-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            A SMARTER WAY TO GET CASH
          </div>
          <h1 id="atm-title">현금이 필요할 때, 더 나은 선택.</h1>
          <p>환전 비용부터 이동 시간까지. 지금 내 상황에 맞춰 비교해요.</p>
        </div>
        <span className="outline-tag">02 / CASH OPTIMIZER</span>
      </div>
      <div className="demo-notice">
        <span>ⓘ</span>
        <p>환율·수수료·장소·이동시간은 모두 시연용입니다. 실제 영업 및 상품 지원 정보는 연결되지 않았어요.</p>
      </div>
      <form className="ai-prompt-card" id="cash-prompt-form" onSubmit={submitPrompt}>
        <div className="ai-label">
          ✦ AI 현금 확보 플래너 
          <span>상황 이해 데모</span>
        </div>
        <label className="sr-only" htmlFor="cash-prompt">
          현금이 필요한 상황
        </label>
        <div className="prompt-input">
          <input id="cash-prompt" maxLength="300" required name="cash-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} />
          <button className="primary compact">방법 찾아보기 ↗</button>
        </div>
        <p id="cash-prompt-status" role="status">{promptStatus}</p>
      </form>
      <div className="cash-layout">
        <div>
          <form className="card" id="atm-form" onSubmit={event => event.preventDefault()}>
            <div className="card-head">
              <div>
                <h3>현금 확보 조건</h3>
                <p>수령액이 같은 방법끼리 비교해요.</p>
              </div>
              <span className="square-icon">€</span>
            </div>
            <div className="two">
              <label>
                필요한 총 현금
                <input id="needed" type="number" min="0" max="1000000" step="0.01" required name="needed" value={cash.needed} onChange={event => setCash(previous => ({ ...previous, needed: event.target.value }))} />
              </label>
              <label>
                이미 가진 현금
                <input id="cash" type="number" min="0" max="1000000" step="0.01" required name="cash" value={cash.cash} onChange={event => setCash(previous => ({ ...previous, cash: event.target.value }))} />
              </label>
            </div>
            <label>
              환전용 원화 현금 (원)
              <input id="cash-krw" type="number" min="0" max="1000000000" step="1" required name="cash-krw" value={cash.cashKRW} onChange={event => setCash(previous => ({ ...previous, cashKRW: event.target.value }))} />
            </label>
            <label>
              비교 위치
              <select id="location" name="location" value={Number(cash.offset) / 3} onChange={event => setCash(previous => ({ ...previous, offset: Number(event.target.value) * 3 }))}>
                <option value="0">시내 중심 · 가상 위치</option>
                <option value="1">관광지 주변 · 가상 위치</option>
                <option value="2">숙소 주변 · 가상 위치</option>
              </select>
            </label>
            <div className="two">
              <label>
                최대 도보 시간
                <select id="walk" name="walk" value={cash.walk} onChange={event => setCash(previous => ({ ...previous, walk: event.target.value }))}>
                  <option value="5">5분</option>
                  <option value="15">15분</option>
                  <option value="30">30분</option>
                </select>
              </label>
              <label>
                외화계좌 잔액
                <input id="balance" type="number" min="0" max="1000000" step="0.01" required name="balance" value={cash.balance} onChange={event => setCash(previous => ({ ...previous, balance: event.target.value }))} />
              </label>
            </div>
            <label className="check-row">
              <input id="topup-supported" type="checkbox" name="topup-supported" checked={cash.supported} onChange={event => setCash(previous => ({ ...previous, supported: event.target.checked }))} />
              <span>충전・ATM 인출 지원을 확인했다고 가정해요</span>
            </label>
            <div className="subtle-note">
              외화계좌와 인출 가능한 카드가 있어야 충전 대안이 포함돼요. 현지 운영사 수수료도 총비용에 반영합니다.
            </div>
            <button className="primary">동일 수령액으로 비용 비교 <span>→</span></button>
          </form>
          <div className="card calculator">
            <div className="card-head">
              <h3>간편 환율 계산기</h3>
              <span className="badge neutral">시연 환율</span>
            </div>
            <div className="two">
              <label>
                <span className="currency-code">{country.code}</span>
                <input id="convert-local" type="number" min="0" max="100000000" step="0.01" name="convert-local" value={localAmount} onChange={event => setLocalAmount(event.target.value)} />
              </label>
              <label>
                KRW · 원
                <input id="convert-krw" type="number" min="0" max="100000000000" step="1" name="convert-krw" value={localAmount === '' ? '' : Math.round(Number(localAmount) * country.rate)} onChange={event => setLocalAmount(event.target.value === '' ? '' : T.round(Number(event.target.value) / country.rate))} />
              </label>
            </div>
            <small id="rate-source">출처: 내장 시연 데이터 · 1 {country.code} = {won(country.rate)} · 시연 버전 2026.10.26 · 실시간 조회 없음</small>
            <button className="text-button" id="rate-upload-open" type="button" onClick={openRateDialog}>현장 환율표 사진으로 비교하기 ↗</button>
          </div>
        </div>
        <div className="cash-results">
          <div id="atm-summary">
            <div className="cash-summary"><div><small>{currentCash.shortage ? '추가로 필요한 현금' : '현금 준비 완료'}</small><strong>{foreign(currentCash.shortage, trip.country)}</strong><p>필요한 총 현금 − 이미 가진 현금</p></div><div className="summary-saving"><small>동일 수령액 비교</small><b>{saving ? won(saving) + ' 차이' : currentCash.shortage ? '조건별 비교' : '추가 확보 불필요'}</b><p>{saving ? '현재 비교 가능한 후보의 최대 차이' : '조건이 확인된 방법만 포함해요'}</p></div></div>
          </div>
          <div className="section-title">
            <h2>현금 확보 방법 비교</h2>
            <select id="cash-sort" aria-label="비교 정렬" name="cash-sort" value={sort} onChange={event => setSort(event.target.value)}>
              <option value="cost">총비용 낮은 순</option>
              <option value="walk">가까운 순</option>
            </select>
          </div>
          <div id="atm-results">
            {currentCash.error ? <p className="empty">{currentCash.error}</p> : !currentCash.shortage ? <div className="card empty">가진 현금으로 필요한 금액을 충당할 수 있어요.</div> : !sorted.length ? <div className="card empty">현재 조건에 맞는 후보가 없어요.<br />도보 범위·카드·계좌 잔액을 확인해 주세요.</div> : sorted.map(item => <div className={'candidate ' + (item.id === best?.id ? 'best' : '')} key={item.id}>
              <div className="candidate-top"><h3>{item.name} {item.id === best?.id && <span className="badge">비교 후보 중 최저</span>}</h3><strong>{won(item.cost)}</strong></div><p>{item.detail}</p><div className="candidate-bottom"><span>도보 {item.walk}분 · 비용 {won(item.fee)} {board && item.id === 'c' && '· 입력 ' + new Date(board.updatedAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })}</span><button type="button" data-candidate={item.id} onClick={() => showPlace(item.id)}>위치 조건 보기 ↗</button></div>
            </div>)}
          </div>
          <div className="cashless-tip">
            <span>✦</span>
            <div>
              <b>현금을 조금 덜 준비하는 방법은요?</b>
              <p id="cashless-text">{trip.card === 'none' ? '보유 카드가 없어요. 카드 발급·현지 사용 가능 여부부터 확인해 주세요.' : `현금 사용 예정액 중 ${foreign(currentCash.shortage, trip.country)}를 카드로 결제할 수 있다면, 시연 결제비용은 ${won(T.paymentCost(currentCash.shortage, trip.card, country.rate))}이에요. 충전 잔액과 한도를 확인해 주세요.`}</p>
              <small>카드결제 가능 여부를 먼저 확인하세요. 현금 수령 대안과 별도로 보는 선택지예요.</small>
            </div>
          </div>
          <div className="card map-card">
            <div className="card-head">
              <h3>주변 비교 위치</h3>
              <span className="badge neutral">실제 지도 아님</span>
            </div>
            <div className="demo-map">
              <div className="river">

              </div>
              <div className="map-street street-a">

              </div>
              <div className="map-street street-b">

              </div>
              <div className="map-street street-c">

              </div>
              <span className="map-label">CITY CENTER · DEMO AREA</span>
              <button className="map-pin pin-a" data-place="a" aria-label="ATM A 상세" onClick={() => showPlace('a')}>A</button>
              <button className="map-pin pin-b" data-place="b" aria-label="충전 후 ATM B 상세" onClick={() => showPlace('b')}>B</button>
              <button className="map-pin pin-c" data-place="c" aria-label="환전소 C 상세" onClick={() => showPlace('c')}>C</button>
              <div className="you-dot">
                <span></span>
                나의 기준 위치
              </div>
            </div>
            <p id="map-detail" ref={mapDetail}>{place ? `${place.name} · 도보 ${place.walk}분 · 수령 ${foreign(place.amount, trip.country)} · 총비용 ${won(place.cost)}. ${place.detail}. 실제 주소와 길찾기는 연결되지 않았어요.` : selectedPlace ? '현재 조건에서 비교할 수 없는 가상 장소예요. 카드·잔액·지원 조건과 도보 시간을 확인해 주세요.' : '마커를 누르면 가상 장소의 비교 조건을 볼 수 있어요.'}</p>
          </div>
        </div>
      </div>
    </section>
    <dialog id="rate-dialog" aria-labelledby="rate-title" ref={dialog}>
      <div className="card-head">
        <div>
          <div className="eyebrow">
            EXCHANGE BOARD
          </div>
          <h2 id="rate-title">현장 환율표 비교</h2>
        </div>
        <button className="dialog-close" id="rate-dialog-close" aria-label="닫기" onClick={() => dialog.current.close()}>×</button>
      </div>
      <p className="body-copy">사진을 보며 적용 환율과 수수료를 입력해 주세요. 자동 이미지 인식은 연결되지 않았어요.</p>
      <label>
        현장 환율표 사진
        <input id="rate-file" type="file" accept="image/jpeg,image/png,image/webp" name="rate-file" onChange={preview.selectFile} />
      </label>
      <img id="rate-preview" className="receipt-preview" alt="선택한 환율표 미리보기" hidden={!preview.url} src={preview.url || undefined} />
      <form id="rate-form" onSubmit={submitRate}>
        <label>
          현지통화 1단위당 원화
          <input id="board-rate" type="number" min="0.01" max="1000000" step="0.01" required name="board-rate" value={boardRate} onChange={event => setBoardRate(event.target.value)} />
        </label>
        <label>
          고정 수수료 (원)
          <input id="board-fee" type="number" min="0" max="10000000" step="1" required name="board-fee" value={boardFee} onChange={event => setBoardFee(event.target.value)} />
        </label>
        <label className="check-row">
          <input id="board-confirm" type="checkbox" required name="board-confirm" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          <span>매입・매도 구분과 적용 조건을 직접 확인했어요</span>
        </label>
        <button className="primary">환전소 C의 비교 조건에 반영 <span>→</span></button>
      </form>
    </dialog>
  </>;
}
