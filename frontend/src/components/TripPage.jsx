import { useState } from 'react';
import { countries, methodNames } from '../utils/core.js';
import { formValues, won } from '../utils/format.js';
import { isKoreanCity, normalizeCity } from '../utils/city.js';
import CountryLandmark from './CountryLandmark.jsx';

export default function TripPage({ trip, hidden, updateTrip, navigate }) {
  const [draftCountry, setDraftCountry] = useState(trip.country);
  const [city, setCity] = useState(() => normalizeCity(trip.city, trip.country));
  const [message, setMessage] = useState('');
  const country = countries[trip.country];
  const heroCity = normalizeCity(trip.city, trip.country);
  const guides = [
    ['€', country.currency + '로 결제해요', '현지통화 ' + country.code + '와 해외원화결제 조건을 비교하세요.'],
    ['▣', trip.card === 'none' ? '카드가 없다면 현금 준비부터' : '보유 카드의 해외 사용을 확인해요',
      trip.card === 'none' ? '환전용 원화 현금과 현지 결제 수단을 확인하세요.' : methodNames[trip.card] + ' · 해외결제 설정, 수수료와 인출 한도 확인'],
    ['↗', trip.account ? '외화계좌의 충전 조건을 확인해요' : '외화 충전 서비스도 비교할 수 있어요',
      trip.account ? '지원 통화·충전 시간·인출 가능 여부를 확인하세요.' : '서비스 개설·사용 가능 여부가 확인된 대안만 비교하세요.'],
  ];

  function submitTrip(event) {
    event.preventDefault();
    const data = formValues(event.currentTarget);
    if (!data.city.trim()) { setMessage('도시를 입력해 주세요.'); return; }
    const koreanCity = normalizeCity(data.city, data.country);
    if (!isKoreanCity(koreanCity)) {
      setMessage('도시명을 한글로 입력해 주세요. 예: 파리, 도쿄, 방콕');
      return;
    }
    if (data.return < data.depart) {
      const input = event.currentTarget.elements.namedItem('return');
      input.setCustomValidity('귀국일은 출발일 이후로 선택해 주세요.');
      input.reportValidity();
      return;
    }
    setCity(koreanCity);
    updateTrip({ country: data.country, city: koreanCity, depart: data.depart, return: data.return,
      budget: Number(data['trip-budget']), cash: Number(data['trip-cash']), card: data.card, account: data.account === 'on' });
    setMessage('여행 정보와 맞춤 금융 가이드를 업데이트했어요. 기존 거래는 기록 당시 환율과 통화를 유지해요.');
  }

  return <>
    <section className="page" id="home" aria-labelledby="home-title" hidden={hidden}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            LESS WORRY. MORE JOURNEY.
          </div>
          <h1 id="home-title">여행의 설렘에, 금융의 여유를.</h1>
          <p>준비부터 결제, 돌려받는 순간까지. 나만의 여행 금융 가이드</p>
        </div>
        <span className="outline-tag">✦ 나에게 맞춘 여행 금융</span>
      </div>
      <div className="hero">
        <div className="hero-copy">
          <span className="hero-tag"><i></i> YOUR JOURNEY STARTS HERE</span>
          <h2>당신의 다음 장은,<br /><i id="hero-city">{isKoreanCity(heroCity) ? heroCity + '.' : '도시를 한글로 입력해 주세요.'}</i></h2>
          <p>작은 카페의 에스프레소부터 기다려온 쇼핑까지.<br />여행의 순간에만 집중할 수 있도록.</p>
          <a className="light-button" href="#setup">나의 여행 설정하기 <span>↗</span></a>
        </div>
        <CountryLandmark countryCode={trip.country} />
        <div className="hero-ticket">
          <div>
            <span>TRAVEL CURRENCY</span>
            <b id="hero-currency">{country.code} <small>{country.currency}</small></b>
          </div>
          <div className="ticket-divider">

          </div>
          <small>시연 기준 환율</small>
          <strong id="hero-rate">{country.symbol}1 = {won(country.rate)}</strong>
          <span>실시간 환율이 아닌 계산 예시예요</span>
        </div>
      </div>
      <div className="journey-strip">
        <span><i className="step-dot active">1</i> 여행 준비</span>
        <b>······</b>
        <button data-go="atm" onClick={() => navigate('atm')}><i className="step-dot">2</i> 현금 확보</button>
        <b>······</b>
        <button data-go="tax" onClick={() => navigate('tax')}><i className="step-dot">3</i> 결제 & 환급</button>
        <b>······</b>
        <button data-go="budget" onClick={() => navigate('budget')}><i className="step-dot">4</i> 여행 돌아보기</button>
      </div>
      <div className="section-title">
        <h2>좋은 여행의 시작, 꼼꼼한 준비<span>01</span></h2>
        <small>입력한 정보가 모든 화면에 연결돼요</small>
      </div>
      <div className="setup-grid">
        <form className="card" id="setup" onSubmit={submitTrip}>
          <div className="card-head">
            <div>
              <h3>나의 여행 정보</h3>
              <p>어디로, 어떤 여행을 떠나시나요?</p>
            </div>
            <span className="square-icon">✈</span>
          </div>
          <div className="two">
            <label>
              여행 국가
              <select id="country" name="country" value={draftCountry} onChange={event => { setDraftCountry(event.target.value); setCity(countries[event.target.value].city); }}>
                <option value="JP">🇯🇵 일본</option>
                <option value="FR">🇫🇷 프랑스</option>
                <option value="TH">🇹🇭 태국</option>
              </select>
            </label>
            <label>
              도시
              <input id="city" maxLength="40" required name="city" lang="ko" placeholder="예: 파리, 도쿄, 방콕" aria-describedby="setup-msg" value={city} onChange={event => setCity(event.target.value)} />
            </label>
          </div>
          <div className="two">
            <label>
              출발일
              <input id="depart" type="date" required name="depart" defaultValue={trip.depart} onInput={event => event.currentTarget.form.elements.namedItem('return').setCustomValidity('')} />
            </label>
            <label>
              귀국일
              <input id="return" type="date" required name="return" defaultValue={trip.return} onInput={event => event.currentTarget.form.elements.namedItem('return').setCustomValidity('')} />
            </label>
          </div>
          <label>
            여행 예산 
            <span className="label-unit">KRW</span>
            <div className="input-unit">
              <input id="trip-budget" type="number" min="1" max="1000000000" step="1" required name="trip-budget" defaultValue={trip.budget} />
              <span>원</span>
            </div>
          </label>
          <div className="two">
            <label>
              보유 카드
              <select id="card" name="card" defaultValue={trip.card}>
                <option value="travel">외화 트래블카드</option>
                <option value="standard">일반 해외결제 카드</option>
                <option value="none">보유 카드 없음</option>
              </select>
            </label>
            <label>
              보유 현금 
              <span className="currency-code">{countries[draftCountry].code}</span>
              <input id="trip-cash" type="number" min="0" max="1000000000" step="0.01" required name="trip-cash" defaultValue={trip.cash} />
            </label>
          </div>
          <label className="check-row">
            <input id="account" type="checkbox" name="account" defaultChecked={trip.account} />
            <span>해외결제용 외화계좌·충전 서비스를 보유하고 있어요</span>
          </label>
          <button className="primary">맞춤 금융 가이드 업데이트 <span>→</span></button>
          <p id="setup-msg" className="form-message" role="status">{message}</p>
        </form>
        <div className="guide-stack">
          <div className="guide-card">
            <div className="eyebrow">
              YOUR MONEY, READY TO GO
            </div>
            <h3>지금 챙기면,<br />여행이 더 가벼워져요.</h3>
            <div id="personal-guide">
              {guides.map(([icon, title, body]) => <div className="guide-item" key={title}>
                <span>{icon}</span><div><b>{title}</b><p>{body}</p></div>
              </div>)}
            </div>
            <div className="dcc-note">
              <span>TIP</span>
              <p>해외원화결제(DCC)는 원화 환산 비용이 더해질 수 있어요. 결제 화면에서 <b>현지통화</b>와 적용 조건을 확인하세요.</p>
            </div>
          </div>
          <div className="account-note">
            <span className="woori-dot">W</span>
            <div>
              <b>외화 충전도 함께 비교해요</b>
              <p>우리금융 서비스의 지원 통화와 한도를 확인하고<br />현지 ATM·환전소와 비용을 비교해 보세요.</p>
            </div>
            <button data-go="atm" aria-label="외화 충전 비용 비교" onClick={() => navigate('atm')}>↗</button>
          </div>
        </div>
      </div>
      <div className="section-title">
        <h2>내 카드, 어떤 조건을 확인할까요?</h2>
        <span className="muted-tag">실제 상품 혜택과 다른 시연 가정</span>
      </div>
      <div className="card fee-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  결제 수단
                </th>
                <th>
                  해외결제 비용
                </th>
                <th>
                  ATM 비용
                </th>
                <th>
                  확인할 내용
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>외화 트래블카드</b>
                  <small>시연용 카드 유형</small>
                </td>
                <td>
                  0% 
                  <span className="badge">계산 가정</span>
                </td>
                <td>
                  운영사 수수료 별도
                </td>
                <td>
                  지원 통화 · 잔액 · 해외 인출
                </td>
              </tr>
              <tr>
                <td>
                  <b>일반 해외결제 카드</b>
                  <small>시연용 카드 유형</small>
                </td>
                <td>
                  1.3% 
                  <span className="badge neutral">계산 가정</span>
                </td>
                <td>
                  카드사 + 현지 운영사
                </td>
                <td>
                  브랜드 · 해외사용 설정 · 한도
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="official-links">
          <span>우리금융 공식 채널에서 실제 조건 확인</span>
          <a href="https://www.wooricard.com/" target="_blank" rel="noopener noreferrer">우리카드 ↗</a>
          <a href="https://www.wooribank.com/" target="_blank" rel="noopener noreferrer">우리은행 ↗</a>
        </div>
      </div>
      <div className="section-title">
        <h2>여행 중 필요한 순간마다</h2>
      </div>
      <div className="quick-grid">
        <button data-go="atm" onClick={() => navigate('atm')}><span className="quick-icon">⇄</span><div><h3>현금이 필요할 때</h3><p>환전소, ATM, 외화 충전을 한 번에</p></div><b>↗</b></button>
        <button data-go="tax" onClick={() => navigate('tax')}><span className="quick-icon peach">▤</span><div><h3>쇼핑을 마친 뒤</h3><p>환급을 반영한 진짜 결제비용 비교</p></div><b>↗</b></button>
        <button data-go="budget" onClick={() => navigate('budget')}><span className="quick-icon lavender">◴</span><div><h3>여행을 돌아볼 때</h3><p>지출과 환급을 담은 나의 리포트</p></div><b>↗</b></button>
      </div>
    </section>
  </>;
}
