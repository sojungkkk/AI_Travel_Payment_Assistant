import { countries } from './core.js';

export function normalizeCity(value, countryCode) {
  const city = String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  const country = countries[countryCode];
  return country && city.toLowerCase() === country.hero.toLowerCase() ? country.city : city;
}

export function isKoreanCity(city) {
  return /^[가-힣]+(?:[\s·-][가-힣]+)*$/u.test(city);
}
