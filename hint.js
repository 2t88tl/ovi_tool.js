(function () {
  'use strict';
  if (window.__OVI_HINT_LOADED) {
    if (window.__OVI_HINT_RENDER) window.__OVI_HINT_RENDER();
    return;
  }
  window.__OVI_HINT_LOADED = true;
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

  function extractAnswers() {
    let qText = '';
    let aTexts = [];
    // 1. Lấy câu hỏi (Dựa vào class thực tế của VUS)
    const qEl = document.querySelector('.question-title, [class*="title"] h2, .instruction');
    if (qEl) qText = clean(qEl.textContent);

    // 2. Tìm các nút đáp án thực sự (các nút bấm có text rõ ràng)
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], .option-item'));
    buttons.forEach(btn => {
      const text = clean(btn.textContent);
      // Chỉ lấy những nút có text ngắn (tránh lấy nhầm thẻ div cha)
      if (text && text.length > 1 && text.length < 50) {
        // Kiểm tra xem nút này có phải đáp án đúng không (dựa vào màu xanh hoặc class correct)
        const isCorrect = btn.className.includes('correct') || 
                          btn.getAttribute('data-correct') === 'true' ||
                          window.getComputedStyle(btn).borderColor.includes('34, 197, 94'); // Màu xanh lá
        if (isCorrect && !aTexts.includes(text)) {
          aTexts.push(text);
        }
      }
    });

    return { qText, aTexts };
  }

  let box = document.createElement('div');
  box.id = '__ovi_hint_box';
  box.style.cssText = `position: fixed; top: 15px; right: 15px; z-index: 999999; background: rgba(15, 23, 42, 0.95); color: #fff; font-family: system-ui, sans-serif; font-size: 13px; border: 1px solid #334155; border-radius: 10px; padding: 12px 15px; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);`;
  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <b style="color:#38bdf8; font-size:14px;">💡 OVI Hint Tool</b>
      <button id="__ovi_close" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">✕</button>
    </div>
    <div id="__ovi_q" style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:10px; color:#cbd5e1; font-size:12px;">Đang tìm câu hỏi...</div>
    <div id="__ovi_a" style="background:rgba(34,197,94,0.15); border:1px solid #16a34a; padding:10px; border-radius:6px; color:#bbf7d0; font-weight:bold; font-size:13px; white-space:pre-wrap;">Đang tìm đáp án...</div>
    <div style="display:flex; gap:8px; margin-top:12px;">
      <button id="__ovi_refresh" style="flex:1; background:#2563eb; color:#fff; border:none; border-radius:6px; padding:8px; cursor:pointer;">🔄 Quét lại</button>
    </div>
  `;
  document.body.appendChild(box);

  const qEl = box.querySelector('#__ovi_q');
  const aEl = box.querySelector('#__ovi_a');

  function render() {
    const { qText, aTexts } = extractAnswers();
    qEl.textContent = qText || '(Không tìm thấy câu hỏi)';
    
    if (aTexts.length > 0) {
      aEl.innerHTML = '✅ ' + aTexts.join('<br>✅ ');
    } else {
      aEl.innerHTML = '⚠ Chưa chọn đáp án hoặc web giấu đáp án.<br><span style="font-weight:normal; font-size:12px; color:#fca5a5;">Hãy thử click 1 đáp án, nếu đúng nó sẽ hiện ở đây.</span>';
    }
  }

  window.__OVI_HINT_RENDER = render;
  box.querySelector('#__ovi_close').onclick = () => { box.remove(); window.__OVI_HINT_LOADED = false; };
  box.querySelector('#__ovi_refresh').onclick = render;

  let timeout = null;
  new MutationObserver(() => { clearTimeout(timeout); timeout = setTimeout(render, 300); }).observe(document.body, { childList: true, subtree: true });
  render();
  console.log('✔ Đã cập nhật OVI Hint Tool bản mới!');
})();
