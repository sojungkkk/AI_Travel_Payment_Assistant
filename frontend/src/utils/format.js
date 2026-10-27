import { countries } from './core.js';

export const won = amount => Math.round(amount).toLocaleString('ko-KR') + '원';
export const foreign = (amount, country = 'FR') => countries[country].symbol + Number(amount).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const createId = () => crypto.randomUUID();
export const colors = { 음식: '#0067ac', 쇼핑: '#38a8df', 교통: '#f0bf64', 숙박: '#174b7a', 관광: '#8bc9f0', 기타: '#b9cfdf' };

export function formValues(form) {
  return Object.fromEntries(new FormData(form));
}
