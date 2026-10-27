import { useState } from 'react';
import { countries } from '../utils/core.js';
import { formValues, won } from '../utils/format.js';
import { isKoreanCity, normalizeCity } from '../utils/city.js';
import { CHECKED_AT, cardCategories, cardsFor, issuersFor, findPreset, cardBenefits, primaryCategory } from '../utils/cards.js';
import CountryLandmark from './CountryLandmark.jsx';

const firstPick = (category, issuer) => cardsFor(category, issuer)[0]?.id || 'custom';
const sameCard = (a, b) => a.id === b.id && (a.id !== 'custom' || (a.category === b.category && a.issuer === b.issuer && a.name === b.name));

export default function TripPage({ trip, hidden, updateTrip, navigate }) {
  const [draftCountry, setDraftCountry] = useState(trip.country);
  const [city, setCity] = useState(() => normalizeCity(trip.city, trip.country));
  const [message, setMessage] = useState('');
  const [cards, setCards] = useState(trip.cards);
  const [category, setCategory] = useState(trip.card);
  const [issuer, setIssuer] = useState(() => issuersFor('standard')[0]);
  const [pickId, setPickId] = useState(() => firstPick(trip.card === 'none' ? 'travel' : trip.card, trip.card === 'standard' ? issuersFor('standard')[0] : undefined));
  const [customName, setCustomName] = useState('');
  const pickIssuer = category === 'standard' ? issuer : undefined;
  const country = countries[trip.country];
  const heroCity = normalizeCity(trip.city, trip.country);

  function changeCategory(value) {
    setCategory(value);
    if (value !== 'none') setPickId(firstPick(value, value === 'standard' ? issuer : undefined));
  }

  function changeIssuer(value) {
    setIssuer(value);
    setPickId(firstPick('standard', value));
  }

  function pickedCard() {
    if (pickId !== 'custom') {
      const { id, category: picked, issuer: cardIssuer, name } = findPreset(pickId);
      return { id, category: picked, issuer: cardIssuer, name };
    }
    const name = customName.trim();
    return name ? { id: 'custom', category, issuer: category === 'standard' && issuer !== 'other' ? issuer : '', name } : null;
  }

  function addCard() {
    const card = pickedCard();
    if (!card) { setMessage('직접 입력할 카드명을 적어 주세요.'); return; }
    if (cards.some(item => sameCard(item, card))) { setMessage('이미 추가한 카드예요.'); return; }
    setCards([...cards, card]);
    setCustomName('');
    setMessage('');
  }

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
    // 카드를 추가하지 않았다면 지금 선택한 카드로 저장합니다. '보유 카드 없음'은 다른 카드와 함께 둘 수 없습니다.
    let nextCards = cards;
    if (data.card === 'none') nextCards = [];
    else if (!cards.length) {
      const card = pickedCard();
      if (!card) { setMessage('직접 입력할 카드명을 적어 주세요.'); return; }
      nextCards = [card];
    }
    setCards(nextCards);
    setCity(koreanCity);
    updateTrip({ country: data.country, city: koreanCity, depart: data.depart, return: data.return,
      budget: Number(data['trip-budget']), cash: Number(data['trip-cash']), card: primaryCategory(nextCards), cards: nextCards, account: data.account === 'on' });
    setMessage('여행 정보를 저장했어요. 기존 거래는 기록 당시 환율과 통화를 유지해요.');
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
      <form className="card" id="setup" onSubmit={submitTrip}>
        <div className="card-head">
          <div>
            <h3>나의 여행 정보</h3>
            <p>어디로, 어떤 여행을 떠나시나요?</p>
          </div>
          <span className="square-icon">✈</span>
        </div>
        <div className="setup-columns">
          <div className="setup-trip">
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
            <label>
              보유 현금
              <span className="currency-code">{countries[draftCountry].code}</span>
              <input id="trip-cash" type="number" min="0" max="1000000000" step="0.01" required name="trip-cash" defaultValue={trip.cash} />
            </label>
          </div>
          <div className="setup-cards">
            <label>
              보유 카드
              <select id="card" name="card" value={category} onChange={event => changeCategory(event.target.value)}>
                {Object.entries(cardCategories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            {category === 'none'
              ? cards.length > 0 && <p className="card-hint">저장하면 추가한 카드가 모두 지워져요.</p>
              : <>
                <div className={category === 'standard' ? 'two' : undefined}>
                  {category === 'standard' && <label>
                    카드사
                    <select id="card-issuer" value={issuer} onChange={event => changeIssuer(event.target.value)}>
                      {issuersFor('standard').map(name => <option value={name} key={name}>{name}</option>)}
                      <option value="other">기타 카드사</option>
                    </select>
                  </label>}
                  <label>
                    카드
                    <select id="card-id" value={pickId} onChange={event => setPickId(event.target.value)}>
                      {cardsFor(category, pickIssuer).map(card => <option value={card.id} key={card.id}>{card.name}</option>)}
                      <option value="custom">기타(직접 입력)</option>
                    </select>
                  </label>
                </div>
                {pickId === 'custom' && <label>
                  카드명
                  <input id="card-name" maxLength="40" placeholder="예: 내 해외결제 카드" value={customName} onChange={event => setCustomName(event.target.value)} />
                </label>}
                <div className="card-add">
                  <button type="button" className="secondary" onClick={addCard}>+ 카드 추가</button>
                  <span>{cards.length ? '여러 장을 추가할 수 있어요.' : '추가하지 않으면 지금 선택한 카드로 저장돼요.'}</span>
                </div>
                {cards.length > 0 && <ul className="card-chips" aria-label="추가한 카드">
                  {cards.map(card => <li key={card.id + card.issuer + card.name}>
                    {card.name || '카드 미지정'}
                    <button type="button" aria-label={(card.name || '카드 미지정') + ' 삭제'} onClick={() => setCards(cards.filter(item => !sameCard(item, card)))}>×</button>
                  </li>)}
                </ul>}
              </>}
            <label className="check-row">
              <input id="account" type="checkbox" name="account" defaultChecked={trip.account} />
              <span>해외결제용 외화계좌·충전 서비스를 보유하고 있어요</span>
            </label>
          </div>
        </div>
        <button className="primary">여행 정보 저장 <span>→</span></button>
        <p id="setup-msg" className="form-message" role="status">{message}</p>
      </form>
      <div className="section-title">
        <h2>내 카드, 어떤 혜택을 가지고 있나요?</h2>
        <span className="muted-tag">카드고릴라 기준 · {CHECKED_AT} 확인</span>
      </div>
      <div className="card fee-card">
        {trip.cards.length ? <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  결제 수단
                </th>
                <th>
                  혜택
                </th>
                <th>
                  조건
                </th>
              </tr>
            </thead>
            <tbody id="card-benefits">
              {trip.cards.flatMap(card => {
                const preset = findPreset(card.id);
                const benefits = cardBenefits(card);
                const key = card.id + card.issuer + card.name;
                const method = <td rowSpan={benefits.length || 1}>
                  <b>{card.name || '카드 미지정'}</b>
                  <small>{preset ? `${preset.issuer} · ${preset.kind} · ${preset.brands.join('/')}` : `${cardCategories[card.category]}${card.issuer ? ' · ' + card.issuer : ''} · 직접 입력`}</small>
                </td>;
                if (!benefits.length) return [<tr key={key}>{method}<td colSpan="2"><span className="badge neutral">확인 필요</span></td></tr>];
                return benefits.map((benefit, index) => <tr key={key + index} className={index < benefits.length - 1 ? 'benefit-cont' : undefined}>
                  {index === 0 && method}
                  <td className="benefit-text">{benefit.text}</td>
                  <td className="benefit-cond">{benefit.condition === '확인 필요' ? <span className="badge neutral">확인 필요</span> : benefit.condition}</td>
                </tr>);
              })}
            </tbody>
          </table>
        </div> : <p className="fee-empty">보유 카드가 없어요. 해외에서 쓸 카드를 준비하고, 우리금융 공식 채널에서 해외결제·외화 충전 상품을 확인해 보세요.</p>}
        <div className="dcc-note">
          <span>TIP</span>
          <p>해외원화결제(DCC)는 원화 환산 비용이 더해질 수 있어요. 결제 화면에서 <b>현지통화</b>와 적용 조건을 확인하세요.</p>
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
