// 3페이지 서버 API 호출 (SPEC 2.3 API 20~23). 개발 서버는 /api 요청을 Spring 서버로 넘긴다 (vite.config.js)
export const SERVER_DOWN = '서버 연결이 필요해요. Spring 서버(8080)를 실행한 뒤 다시 시도해 주세요.';

export const errorText = {
  INVALID_VAT: 'VAT 번호는 FR + 영숫자 2자 + 숫자 9자예요. 모르면 비워 두세요.',
  INVALID_BVE: '환급사업자(1~40자)와 수령 방식을 확인해 주세요.',
  INVALID_BVE_DATE: '발행일은 묶음의 첫 구매일 이후여야 해요.',
  INVALID_REFUND_AMOUNT: '환급 예정액은 €0.01 이상, 합계에 포함된 VAT(합계 × 20 ÷ 120) 이하여야 해요.',
  INVALID_CONFIRM_DATE: '세관 확인일은 서류 발행일 이후, 상태 기준일 이전이어야 해요. 기준일을 확인해 주세요.',
  INVALID_AMOUNT: '금액은 €0.01~1,000,000 사이로 입력해 주세요.',
};

export const todayISO = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

async function send(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error(SERVER_DOWN);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.errors?.[0];
    // 프록시가 서버에 닿지 못하면 본문 없는 5xx가 온다
    throw new Error(errorText[error?.code] || error?.message || (res.status >= 500 ? SERVER_DOWN : '요청을 처리하지 못했어요.'));
  }
  return data;
}

export const postJSON = (url, body) => send(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

/** 영수증 사진 인식 (R51). 읽은 항목만 돌려준다. */
export function recognizeReceipt(file) {
  const body = new FormData();
  body.append('file', file);
  return send('/api/receipts/ocr', { method: 'POST', body });
}
