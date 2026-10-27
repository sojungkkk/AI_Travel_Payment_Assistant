import { useEffect, useState } from 'react';
import * as T from '../utils/core.js';
import { createId as id } from '../utils/format.js';
import { normalizeCity } from '../utils/city.js';
import { normalizeCards, primaryCategory } from '../utils/cards.js';

const DEFAULT_COUNTRY_VERSION = 1;

const defaults = () => ({ version:2, defaultCountryVersion:DEFAULT_COUNTRY_VERSION, trip:{country:'JP',city:'도쿄',depart:'2026-11-10',return:'2026-11-17',budget:3000000,cash:80,card:'travel',cards:[{id:'2394',category:'travel',issuer:'하나카드',name:'트래블로그 체크카드'}],account:true}, receipts:[{id:'demo-receipt',store:'파리 백화점 · 예시',date:'2026-11-12',amount:420,eligible:true,docs:true,instant:true,city:false,method:'travel',country:'FR'}], expenses:[['파리의 작은 비스트로',48,'음식'],['공항에서 숙소까지',25,'교통'],['마레 지구 기념품',85,'쇼핑'],['센 강 근처의 숙소',240,'숙박'],['미술관 관람',22,'관광']].map(([name,amount,category],i)=>({id:'demo-expense-'+i,name,amount,category,date:'2026-11-11',country:'FR',method:i===0?'cash':'travel',type:'purchase',rate:1580,cost:T.paymentCost(amount,i===0?'cash':'travel',1580),fee:T.paymentCost(amount,i===0?'cash':'travel',1580)-Math.round(amount*1580),expectedRefund:0,actualRefund:null})), selected:'demo-receipt', choices:{}, board:null, exitAirport:'파리 샤를드골 (CDG)', exitCountry:'FR' });

function migrateDefaultCountry(state, previousVersion = 0) {
  const wasOldParisDefault = previousVersion < DEFAULT_COUNTRY_VERSION
    && state.trip.country === 'FR'
    && normalizeCity(state.trip.city, 'FR') === '파리';

  return {
    ...state,
    defaultCountryVersion: Math.max(previousVersion, DEFAULT_COUNTRY_VERSION),
    ...(wasOldParisDefault ? {
      trip: { ...state.trip, country: 'JP', city: '도쿄' },
      board: null,
    } : {}),
  };
}

function loadSavedState() {
  let state = defaults(), storageWarning = false;
  try {
    const saved = JSON.parse(localStorage.getItem('travelback-finance-v2'));
    if (saved?.version === 2 && Array.isArray(saved.expenses) && Array.isArray(saved.receipts) && T.countries[saved.trip?.country]) {
      const cards = normalizeCards(saved.trip);
      state = {...defaults(),...saved,trip:{...defaults().trip,...saved.trip,cards,card:primaryCategory(cards)}, choices:saved.choices || {}};
      state.expenses = saved.expenses.filter(e=>T.valid(e.amount)&&T.valid(e.cost)&&T.countries[e.country]&&typeof e.name==='string');
      state.receipts = saved.receipts.filter(r=>T.valid(r.amount)&&r.amount>0&&typeof r.store==='string'&&typeof r.date==='string');
      return { data: migrateDefaultCountry(state, saved.defaultCountryVersion), warning: false };
    }
    const old = JSON.parse(localStorage.getItem('bonjour-finance-v1'));
    if (old && Array.isArray(old.expenses) && Array.isArray(old.receipts)) {
      const card = old.trip?.hasCard==='no'?'none':'travel';
      state.trip = {...state.trip, country:'FR',city:'파리', depart:old.trip?.depart || state.trip.depart,return:old.trip?.return || state.trip.return,card,cards:normalizeCards({card}),budget:T.valid(old.budget)?Math.round(old.budget*1580):3000000};
      state.expenses = old.expenses.filter(e=>T.valid(e.amount)&&typeof e.name==='string').map(e=>({id:id(),...e,category:e.category==='식비'?'음식':e.category,date:'2026-11-11',country:'FR',method:'travel',type:'purchase',rate:1580,cost:Math.round(e.amount*1580),fee:0,expectedRefund:0,actualRefund:null}));
      state.receipts = old.receipts.filter(r=>T.valid(r.amount)&&typeof r.store==='string').map(r=>({...r,id:id(),eligible:r.eligible==='yes',docs:false,instant:false,city:false,method:'travel',country:'FR'}));
      state.selected = state.receipts[0]?.id || null;
      state = migrateDefaultCountry(state);
    }
  } catch { storageWarning = true; }
  return { data: state, warning: storageWarning };
}

export default function useTravelState(notify) {
  const [initial] = useState(loadSavedState);
  const [state, setState] = useState(initial.data);

  useEffect(() => {
    if (initial.warning) notify('저장된 정보를 읽지 못해 시연 데이터를 표시했어요.');
  }, [initial.warning, notify]);

  useEffect(() => {
    try { localStorage.setItem('travelback-finance-v2', JSON.stringify(state)); }
    catch { notify('브라우저 저장 공간을 사용할 수 없어 이번 화면에만 반영돼요.'); }
  }, [state, notify]);

  return [state, setState];
}
