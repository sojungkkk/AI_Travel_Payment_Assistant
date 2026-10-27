'use strict';
// 영수증 사진을 고르면 /api/receipts/ocr로 읽어 입력칸 초안을 채운다 (R51). 등록은 사용자가 확인한 뒤 기존 폼으로 한다.
(() => {
  const el = id => document.getElementById(id);
  const input = el('receipt-file'), message = el('receipt-message'), form = el('tax-form');
  const preview = input.onchange;
  const images = ['image/jpeg', 'image/png', 'image/webp'];
  // 인식 중에는 사진 선택칸만 남기고 나머지 입력칸 · 등록 버튼을 잠근다 (다른 사진을 고르면 이전 요청을 버린다)
  const controls = [...form.querySelectorAll('input, select, button')].filter(c => c !== input);
  let latest = 0;

  const wasDisabled = new Map(); // 원래 꺼져 있던 칸(프랑스 외 국가의 등록 버튼 등)은 인식 뒤에도 꺼 둔다
  const reading = on => {
    if (on === form.classList.contains('ocr-reading')) return;
    form.classList.toggle('ocr-reading', on);
    form.setAttribute('aria-busy', String(on));
    message.classList.toggle('ocr-status', on);
    controls.forEach(c => {
      if (on) { wasDisabled.set(c, c.disabled); c.disabled = true; } else c.disabled = wasDisabled.get(c);
    });
  };

  // 채운 칸을 잠깐 강조해서 무엇이 바뀌었는지 보이게 한다
  const highlight = ids => {
    form.querySelectorAll('.ocr-filled').forEach(c => c.classList.remove('ocr-filled'));
    void form.offsetWidth; // 같은 칸을 연달아 채워도 애니메이션이 다시 돈다
    ids.forEach(id => el(id).classList.add('ocr-filled'));
  };

  input.onchange = async () => {
    preview?.();
    const file = input.files[0];
    if (!file || !images.includes(file.type) || file.size > 10 * 1024 * 1024) { reading(false); return; } // PDF는 미리보기만
    const request = ++latest;
    reading(true);
    message.textContent = '사진을 읽는 중이에요…';
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/receipts/ocr', { method: 'POST', body });
      const data = await res.json();
      if (request !== latest) return; // 그사이 다른 사진을 골랐으면 이전 결과는 버린다
      reading(false);
      if (!res.ok) {
        message.textContent = data.errors?.[0]?.message || '사진을 읽지 못했어요. 영수증 정보를 직접 입력해 주세요.';
        return;
      }
      const filled = [], ids = [];
      if (data.store) { el('store').value = data.store; filled.push('매장명'); ids.push('store'); }
      if (data.date) { el('purchase-date').value = data.date; filled.push('구매일'); ids.push('purchase-date'); }
      if (data.amount != null) { el('purchase-amount').value = data.amount; filled.push('금액'); ids.push('purchase-amount'); }
      if (data.method) { el('purchase-method').value = data.method; filled.push('결제 수단'); ids.push('purchase-method'); }
      highlight(ids);
      message.textContent = filled.length
        ? `사진에서 ${filled.join(' · ')}을(를) 채웠어요. 내용을 확인하고 결제 수단 · 서류 · 자격 항목을 고른 뒤 등록해 주세요.`
        : '사진에서 읽은 항목이 없어요. 영수증 정보를 직접 입력해 주세요.';
    } catch {
      if (request !== latest) return;
      reading(false);
      message.textContent = '사진 인식 서버에 연결하지 못했어요. 영수증 정보를 직접 입력해 주세요.';
    }
  };
})();
