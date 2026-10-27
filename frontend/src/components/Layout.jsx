import { countries } from '../utils/core.js';
import serviceIcon from '../assets/travel-pudding.png';

const titles = { home: '나의 여행', atm: '환전 · ATM', tax: '택스 리펀드', budget: '여행 가계부' };

export default function Layout({ trip, activeTab, navigate, children }) {
  const country = countries[trip.country];
  const days = Math.round((new Date(trip.return) - new Date(trip.depart)) / 86400000) + 1;
  return <>
    <a className="skip-link" href="#main">본문으로 이동</a>
    <aside className="sidebar">
      <a className="brand" href="#home" aria-label="여행WON해 홈"><img className="brand-mark" src={serviceIcon} alt="" /><span className="brand-text">여행<span className="brand-won">WON</span>해<small>나의 여행 금융 도우미</small></span><i>AI</i></a>
      <div className="nav-caption">
        MY TRAVEL WORKSPACE
      </div>
      <nav aria-label="주요 메뉴">
        <button data-tab="home" className={activeTab === 'home' ? 'active' : ''} onClick={() => navigate('home')} aria-current={activeTab === 'home' ? 'page' : undefined}><span className="nav-icon">⌂</span><span>나의 여행<small>여행 정보 & 금융 가이드</small></span><em>01</em></button>
        <button data-tab="atm" className={activeTab === 'atm' ? 'active' : ''} onClick={() => navigate('atm')} aria-current={activeTab === 'atm' ? 'page' : undefined}><span className="nav-icon">⇄</span><span>환전 · ATM<small>현금 확보 방법 비교</small></span><em>02</em></button>
        <button data-tab="tax" className={activeTab === 'tax' ? 'active' : ''} onClick={() => navigate('tax')} aria-current={activeTab === 'tax' ? 'page' : undefined}><span className="nav-icon">▤</span><span>택스 리펀드<small>환급 & 최종 결제비용</small></span><em>03</em></button>
        <button data-tab="budget" className={activeTab === 'budget' ? 'active' : ''} onClick={() => navigate('budget')} aria-current={activeTab === 'budget' ? 'page' : undefined}><span className="nav-icon">◴</span><span>여행 가계부<small>지출 & 금융 리포트</small></span><em>04</em></button>
      </nav>
      <div className="sidebar-trip">
        <div className="mini-label">
          YOUR NEXT CHAPTER
        </div>
        <div className="trip-city">
          <span id="sidebar-flag">{country.flag}</span>
          <b id="sidebar-city">{trip.city + ', ' + country.english}</b>
        </div>
        <p id="sidebar-dates">{trip.depart.slice(5).replace('-', '.')} — {trip.return.slice(5).replace('-', '.')} · {days}일간의 여행</p>
        <div className="trip-route">
          <span>ICN</span>
          <span>···· ✈ ····</span>
          <span id="trip-airport">{country.airport}</span>
        </div>
      </div>
      <div className="sidebar-bottom">
        <span className="woori-dot">W</span>
        <div>
          우리금융과 함께하는 여행
          <small>금융 조건은 공식 채널에서 확인해요</small>
        </div>
      </div>
    </aside>
    <main id="main">
      <header className="topbar">
        <div className="breadcrumb">
          나의 워크스페이스 
          <span>/</span>
          <b id="page-title">{titles[activeTab]}</b>
        </div>
        <div className="header-right">
          <span className="demo-tag"><i></i> 인터랙티브 데모</span>
          <button className="avatar" id="profile-button" aria-label="여행 설정으로 이동" onClick={() => navigate('setup')}><img src={serviceIcon} alt="" /></button>
        </div>
      </header>
      {children}
      <footer>
        <span className="footer-brand">여행<b>WON</b>해</span>
        <span>실제 AI・OCR・은행・위치 연동 없는 목업 · 입력 정보는 이 브라우저에 저장돼요.</span>
        <span>MADE FOR YOUR NEXT JOURNEY ↗</span>
      </footer>
    </main>
  </>;
}
