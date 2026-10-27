import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout.jsx';
import TripPage from './components/TripPage.jsx';
import CashPage from './components/CashPage.jsx';
import RefundPage from './components/RefundPage.jsx';
import BudgetPage from './components/BudgetPage.jsx';
import ChatBot from './components/ChatBot.jsx';
import useTravelState from './hooks/useTravelState.js';
import { cashCandidates, countries } from './utils/core.js';

const tabs = ['home', 'atm', 'tax', 'budget'];
const initialCash = trip => ({ needed: trip.country === 'JP' ? 20000 : trip.country === 'TH' ? 3000 : 150,
  cash: trip.cash, balance: trip.country === 'JP' ? 30000 : trip.country === 'TH' ? 5000 : 250,
  cashKRW: 300000, supported: true, walk: 15, offset: 0 });

export default function App() {
  const [toast, setToast] = useState(null);
  const notify = useCallback(message => setToast({ message }), []);
  const [state, setState] = useTravelState(notify);
  const [activeTab, setActiveTab] = useState(() => tabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home');
  const [cash, setCash] = useState(() => initialCash(state.trip));

  const navigate = useCallback(name => {
    const page = tabs.includes(name) ? name : 'home';
    setActiveTab(page);
    history.replaceState(null, '', '#' + (name === 'setup' ? 'setup' : page));
    requestAnimationFrame(() => {
      if (name === 'setup') document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }, []);

  useEffect(() => {
    const change = () => navigate(location.hash.slice(1));
    window.addEventListener('hashchange', change);
    change();
    return () => window.removeEventListener('hashchange', change);
  }, [navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentCash = useMemo(() => {
    const config = countries[state.trip.country];
    try {
      const amounts = Object.fromEntries(Object.entries(cash).map(([key, value]) => [key, key === 'supported' ? value : Number(value)]));
      return cashCandidates({ ...amounts, rate: config.rate, operatorFee: config.atmFee,
        card: state.trip.card, account: state.trip.account, board: state.board });
    } catch (error) {
      return { shortage: 0, candidates: [], error: error.message };
    }
  }, [cash, state.trip, state.board]);

  function updateTrip(trip) {
    const changed = trip.country !== state.trip.country;
    setState(previous => ({ ...previous, trip, board: changed ? null : previous.board }));
    setCash(previous => ({ ...(changed ? initialCash(trip) : previous), cash: trip.cash }));
    notify('모든 화면에 여행 정보를 반영했어요.');
  }

  return <>
    <Layout trip={state.trip} activeTab={activeTab} navigate={navigate}>
      <TripPage trip={state.trip} hidden={activeTab !== 'home'} updateTrip={updateTrip} navigate={navigate} />
      <CashPage trip={state.trip} board={state.board} cash={cash} setCash={setCash} currentCash={currentCash}
        hidden={activeTab !== 'atm'} setState={setState} notify={notify} />
      <RefundPage state={state} setState={setState} hidden={activeTab !== 'tax'} notify={notify} />
      <BudgetPage state={state} setState={setState} hidden={activeTab !== 'budget'} notify={notify} />
    </Layout>
    <ChatBot state={state} currentCash={currentCash} />
    <div id="toast" role="status" hidden={!toast}>{toast?.message}</div>
  </>;
}
