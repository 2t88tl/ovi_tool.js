// =====================================================================
// OVI HUB - HINT TOOL (Chỉ hiện đáp án, không auto click/nộp)
// Dùng cho trang: https://ovi.vus.edu.vn/hubs/practice/courses/...
// =====================================================================
(function () {
  'use strict';

  if (window.__OVI_HINT_LOADED) {
    console.log('⚠ OVI Hint đã chạy rồi! (Nhấn nút 🔄 trên bảng để cập nhật)');
    if (window.__OVI_HINT_RENDER) window.__OVI_HINT_RENDER();
    return;
  }
  window.__OVI_HINT_LOADED = true;

  // ==========================================
  // 1. DÒ TÌM VÀ TRÍCH XUẤT ĐÁP ÁN TỪ DOM
  // ==========================================
  
  // Hàm làm sạch text
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

  // Các selector phổ biến chứa câu hỏi và đáp án đúng
  const QUESTION_SELECTORS = [
    '.question-title', '.question-text', '.q-title', 
    'h2', 'h3', '[class*="question"]', '[class*="title"]'
  ];

  const ANSWER_SELECTORS = [
    '.correct-answer', '.answer-correct', '[data-correct="true"]', 
    '[class*="correct"]', '[class*="true"]', '.is-correct',
    '.right-answer'
  ];

  // Hàm cố gắng tìm đáp án đúng
  function extractAnswers() {
    let qText = '';
    let aTexts = [];

    // --- Tìm câu hỏi ---
    for (const sel of QUESTION_SELECTORS) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.getClientRects().length > 0 && clean(el.textContent).length > 10) {
          qText = clean(el.textContent);
          break;
        }
      }
      if (qText) break;
    }

    // --- Tìm đáp án đúng bằng Class/Attribute ---
    for (const sel of ANSWER_SELECTORS) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.getClientRects().length > 0) {
          const t = clean(el.textContent);
          if (t && t.length > 0 && !aTexts.includes(t)) aTexts.push(t);
        }
      }
      if (aTexts.length > 0) break;
    }

    // --- Nếu không thấy đáp án đúng, thử tìm trong Input (Trắc nghiệm/Điền từ) ---
    if (aTexts.length === 0) {
      // Quét các thẻ input có value (ví dụ input ẩn chứa đáp án)
      const inputs = document.querySelectorAll('input[type="hidden"], input[type="text"]');
      for (const inp of inputs) {
        if (inp.value && inp.value.length > 0 && inp.value !== inp.placeholder) {
          // Kiểm tra xem input này có nằm trong khu vực câu hỏi không
          const p = inp.closest('[class*="question"], form, .exercise');
          if (p) aTexts.push(clean(inp.value));
        }
      }
    }

    // --- Fallback: Lấy tất cả các lựa chọn (để người dùng tự đoán nếu không có data-correct) ---
    if (aTexts.length === 0) {
      const opts = document.querySelectorAll('.option, .choice, [class*="option"], [class*="choice"]');
      for (const opt of opts) {
        if (opt.getClientRects().length > 0) {
          const t = clean(opt.textContent);
          if (t && t.length > 0) aTexts.push(t);
        }
      }
    }

    return { qText, aTexts };
  }

  // ==========================================
  // 2. TẠO UI OVERLAY
  // ==========================================
  let box = document.createElement('div');
  box.id = '__ovi_hint_box';
  box.style.cssText = `
    position: fixed; top: 15px; right: 15px; z-index: 999999;
    background: rgba(15, 23, 42, 0.95); color: #fff;
    font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.6;
    border: 1px solid #334155; border-radius: 10px;
    padding: 12px 15px; width: 320px; max-height: 60vh; overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(5px);
  `;

  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <b style="color:#38bdf8; font-size:14px;">💡 OVI Hint Tool</b>
      <button id="__ovi_close" style="background:none; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">✕</button>
    </div>
    
    <div id="__ovi_q" style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:10px; color:#cbd5e1; font-size:12px;">
      Đang tìm câu hỏi...
    </div>
    
    <div id="__ovi_a" style="background:rgba(34,197,94,0.15); border:1px solid #16a34a; padding:10px; border-radius:6px; color:#bbf7d0; font-weight:bold; font-size:13px; white-space:pre-wrap; word-break:break-word;">
      Đang tìm đáp án...
    </div>
    
    <div style="display:flex; gap:8px; margin-top:12px;">
      <button id="__ovi_refresh" style="flex:1; background:#2563eb; color:#fff; border:none; border-radius:6px; padding:8px; cursor:pointer; font-weight:bold;">🔄 Cập nhật</button>
      <button id="__ovi_help" style="flex:1; background:#475569; color:#fff; border:none; border-radius:6px; padding:8px; cursor:pointer;">❓ Hướng dẫn</button>
    </div>
  `;

  document.body.appendChild(box);

  const qEl = box.querySelector('#__ovi_q');
  const aEl = box.querySelector('#__ovi_a');

  // ==========================================
  // 3. LOGIC CẬP NHẬT
  // ==========================================
  function render() {
    const { qText, aTexts } = extractAnswers();

    if (!qText && aTexts.length === 0) {
      qEl.textContent = '⚠ Không tìm thấy dữ liệu câu hỏi...';
      aEl.textContent = 'Hãy làm 1 câu, hoặc bấm F12 -> Network xem API trả về để mình fix code.';
      return;
    }

    qEl.textContent = qText || '(Không rõ câu hỏi)';

    if (aTexts.length > 0) {
      // Nếu tìm thấy đáp án (có class correct, data-correct...)
      aEl.innerHTML = '✅ ' + aTexts.join('<br>✅ ');
      aEl.style.background = 'rgba(34,197,94,0.15)';
      aEl.style.borderColor = '#16a34a';
      aEl.style.color = '#bbf7d0';
    } else {
      // Nếu không thấy đáp án, hiện các option để người dùng tự đoán
      aEl.innerHTML = '⚠ Không thấy đáp án đúng trong DOM.<br><span style="font-weight:normal; font-size:12px; color:#fca5a5;">Có thể web dùng API. Hãy bấm F12 -> Network xem có request nào trả về JSON không.</span>';
      aEl.style.background = 'rgba(239,68,68,0.15)';
      aEl.style.borderColor = '#ef4444';
      aEl.style.color = '#fca5a5';
    }
  }

  // Gán hàm render ra window để gọi lại từ console
  window.__OVI_HINT_RENDER = render;

  // Xử lý sự kiện nút
  box.querySelector('#__ovi_close').onclick = () => { box.style.display = 'none'; };
  box.querySelector('#__ovi_refresh').onclick = () => { 
    aEl.textContent = 'Đang quét lại...';
    setTimeout(render, 100); 
  };
  box.querySelector('#__ovi_help').onclick = () => {
    alert('1. Bấm F12 -> tab Network.\n2. Làm 1 câu bất kỳ trên web.\n3. Tìm request API trả về câu hỏi/đáp án.\n4. Copy nội dung JSON gửi cho AI để fix code.');
  };

  // Tự động cập nhật khi DOM thay đổi
  let timeout = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(render, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  // Chạy lần đầu
  render();
  console.log('✔ OVI Hint Tool đã sẵn sàng!');

})();
