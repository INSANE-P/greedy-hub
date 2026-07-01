/* 그리디 허브 — 위치 핀 피드백 위젯 (MVP 미리보기 전용, 개발용)
   Firebase Firestore 저장·실시간 공유 · 요소 앵커로 노트북 간 위치 정확
   커스텀 UI(브라우저 prompt/alert 미사용) · 삭제는 본인 글만 */
(function () {
  if (window.__gfbLoaded) return; window.__gfbLoaded = true;

  const cfg = {
    apiKey: "AIzaSyA1EsiKfHPXQtijoNu13iAN9MsXQleNTBE",
    authDomain: "greedy-hub-feedback.firebaseapp.com",
    projectId: "greedy-hub-feedback",
    storageBucket: "greedy-hub-feedback.firebasestorage.app",
    messagingSenderId: "92049334341",
    appId: "1:92049334341:web:62f10683607adb7911832c",
  };
  const PAGE = (location.pathname.split('/').pop() || 'index.html');
  const V = "10.12.2";
  const GREEN = "#017356";

  const uid = localStorage.getItem('gfb_uid') || (() => { const u = 'u' + Math.random().toString(36).slice(2, 10); localStorage.setItem('gfb_uid', u); return u; })();
  let name = localStorage.getItem('gfb_name') || '';
  let db, pins = [], placing = false, dark = () => document.documentElement.classList.contains('dark');

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });

  function styles() {
    const css = `
    .gfb-bar{position:fixed;left:14px;bottom:14px;z-index:70;display:flex;align-items:center;gap:6px;background:#fff;color:#0f172a;border-radius:999px;padding:6px 6px 6px 14px;box-shadow:0 10px 30px rgba(15,23,42,.22);font:600 13px/1 inherit}
    .dark .gfb-bar{background:#1e293b;color:#e2e8f0}
    .gfb-dot{width:8px;height:8px;border-radius:50%;background:${GREEN};box-shadow:0 0 0 3px ${GREEN}22}
    .gfb-title{font-weight:800;letter-spacing:-.2px;margin-right:2px}
    .gfb-name{font-size:12px;color:${GREEN};background:${GREEN}14;border-radius:999px;padding:4px 8px;cursor:pointer;font-weight:700}
    .gfb-add{background:${GREEN};color:#fff;border:0;border-radius:999px;padding:8px 14px;font-weight:800;cursor:pointer;font-size:13px}
    .gfb-add:hover{filter:brightness(1.08)}
    .gfb-add.on{background:#ef4444}
    .gfb-x{background:transparent;border:0;color:#94a3b8;cursor:pointer;font-size:12px;padding:6px 8px;border-radius:999px}
    .gfb-x:hover{background:#0f172a0d}
    .gfb-hint{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:71;background:${GREEN};color:#fff;border-radius:999px;padding:8px 16px;font:700 12px/1 inherit;box-shadow:0 8px 24px rgba(0,0,0,.2)}
    .gfb-pin{position:absolute;z-index:66;transform:translate(-50%,-50%)}
    .gfb-pin>button{width:26px;height:26px;border-radius:50% 50% 50% 3px;background:${GREEN};color:#fff;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3);font:800 11px/1 inherit;cursor:pointer}
    .gfb-pop,.gfb-compose{position:absolute;z-index:68;width:250px;background:#fff;color:#0f172a;border-radius:14px;box-shadow:0 14px 40px rgba(15,23,42,.25);padding:14px;font:400 13px/1.5 inherit}
    .dark .gfb-pop,.dark .gfb-compose{background:#1e293b;color:#e2e8f0}
    .gfb-pop .who{font-weight:800;margin-bottom:4px}
    .gfb-pop .when{font-weight:400;color:#94a3b8;font-size:11px}
    .gfb-pop .txt{white-space:pre-wrap;word-break:break-word}
    .gfb-del{margin-top:10px;color:#ef4444;background:none;border:0;font-size:12px;cursor:pointer;font-weight:700;padding:0}
    .gfb-compose textarea{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;padding:9px;font:inherit;resize:vertical;min-height:64px;outline:none;background:#f8fafc}
    .dark .gfb-compose textarea{background:#0f172a;border-color:#334155;color:#e2e8f0}
    .gfb-compose textarea:focus{border-color:${GREEN}}
    .gfb-row{display:flex;gap:6px;justify-content:flex-end;margin-top:9px}
    .gfb-primary{background:${GREEN};color:#fff;border:0;border-radius:9px;padding:7px 13px;font-weight:800;cursor:pointer;font-size:13px}
    .gfb-cancel{background:transparent;color:#64748b;border:0;cursor:pointer;font-size:13px;padding:7px 10px}
    .gfb-overlay{position:fixed;inset:0;z-index:80;background:rgba(15,23,42,.45);display:grid;place-items:center}
    .gfb-modal{width:320px;max-width:90vw;background:#fff;color:#0f172a;border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.3);font:400 14px/1.5 inherit}
    .dark .gfb-modal{background:#1e293b;color:#e2e8f0}
    .gfb-modal h3{margin:0 0 4px;font-size:18px;font-weight:800}
    .gfb-modal p{margin:0 0 14px;color:#64748b;font-size:13px}
    .gfb-modal input{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:11px;padding:11px;font:inherit;outline:none;background:#f8fafc}
    .dark .gfb-modal input{background:#0f172a;border-color:#334155;color:#e2e8f0}
    .gfb-modal input:focus{border-color:${GREEN}}
    .gfb-toast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:90;background:#0f172a;color:#fff;border-radius:10px;padding:10px 16px;font:600 13px/1 inherit;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transition:opacity .2s}
    `;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'gfb-toast'; t.textContent = msg; document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2600);
  }

  function askName(after) {
    const ov = document.createElement('div'); ov.className = 'gfb-overlay';
    ov.innerHTML = `<div class="gfb-modal"><h3>피드백에 표시할 이름</h3><p>다른 사람이 누구 코멘트인지 알 수 있게요.</p>
      <input id="gfb-ninput" placeholder="예: 찬빈" value="${esc(name)}" maxlength="20"/>
      <div class="gfb-row" style="margin-top:16px"><button class="gfb-primary" id="gfb-save">시작</button></div></div>`;
    document.body.appendChild(ov);
    const inp = ov.querySelector('#gfb-ninput');
    inp.focus(); inp.select();
    const done = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } name = v; localStorage.setItem('gfb_name', v); ov.remove(); updateBar(); if (after) after(); };
    ov.querySelector('#gfb-save').onclick = done;
    inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
    ov.onclick = (e) => { if (e.target === ov && name) ov.remove(); };
  }

  let bar;
  function buildBar() {
    bar = document.createElement('div'); bar.className = 'gfb-bar'; bar.id = 'gfb-ui';
    document.body.appendChild(bar); updateBar();
    document.addEventListener('click', onPlaceClick, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPlacing(false); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.gfb-pin')) closePops(); });
  }
  function updateBar() {
    bar.innerHTML = `<span class="gfb-dot"></span><span class="gfb-title">피드백</span>
      <span class="gfb-name" id="gfb-name">${name ? esc(name) : '이름 설정'}</span>
      <button class="gfb-add ${placing ? 'on' : ''}" id="gfb-add">${placing ? '취소' : '+ 코멘트'}</button>
      <button class="gfb-x" id="gfb-off" title="피드백 끄기">✕</button>`;
    bar.querySelector('#gfb-name').onclick = () => askName();
    bar.querySelector('#gfb-add').onclick = () => { if (!name) return askName(() => setPlacing(true)); setPlacing(!placing); };
    bar.querySelector('#gfb-off').onclick = () => { sessionStorage.removeItem('greedy_fb'); location.reload(); };
  }

  let hint;
  function setPlacing(on) {
    placing = on; document.body.style.cursor = on ? 'crosshair' : '';
    updateBar();
    if (on && !hint) { hint = document.createElement('div'); hint.className = 'gfb-hint'; hint.textContent = '코멘트를 남길 위치를 클릭하세요 · ESC 취소'; document.body.appendChild(hint); }
    if (!on && hint) { hint.remove(); hint = null; }
  }

  function onPlaceClick(e) {
    if (!placing) return;
    if (e.target.closest('#gfb-ui') || e.target.closest('.gfb-pin') || e.target.closest('.gfb-compose')) return;
    e.preventDefault(); e.stopPropagation();
    setPlacing(false);
    const el = e.target, r = el.getBoundingClientRect();
    const anchor = { sel: cssPath(el), xr: r.width ? (e.clientX - r.left) / r.width : 0.5, yr: r.height ? (e.clientY - r.top) / r.height : 0.5 };
    openComposer(e.clientX, e.clientY, anchor);
  }

  function openComposer(cx, cy, anchor) {
    closePops();
    const c = document.createElement('div'); c.className = 'gfb-compose';
    c.innerHTML = `<textarea placeholder="이 위치에 대한 의견을 적어주세요"></textarea>
      <div class="gfb-row"><button class="gfb-cancel">취소</button><button class="gfb-primary">남기기</button></div>`;
    document.body.appendChild(c);
    const w = 250, x = Math.min(cx, window.innerWidth - w - 12), y = Math.min(cy, window.innerHeight - 160);
    c.style.left = (x + window.scrollX) + 'px'; c.style.top = (y + window.scrollY) + 'px';
    const ta = c.querySelector('textarea'); ta.focus();
    c.querySelector('.gfb-cancel').onclick = () => c.remove();
    c.querySelector('.gfb-primary').onclick = () => {
      const text = ta.value.trim(); if (!text) { ta.focus(); return; }
      c.remove();
      db.collection('feedback').add({ page: PAGE, sel: anchor.sel, xr: anchor.xr, yr: anchor.yr, text: text.slice(0, 1000), author: name, uid, ts: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(err => { console.error(err); toast('저장 실패 — Firestore/규칙을 확인하세요'); });
    };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) c.querySelector('.gfb-primary').click(); };
  }

  function closePops() { document.querySelectorAll('.gfb-pop, .gfb-compose').forEach(n => n.remove()); }

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return 'body';
    const parts = [];
    while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== 'html') {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      const tag = el.tagName.toLowerCase(), parent = el.parentElement;
      if (!parent) { parts.unshift(tag); break; }
      const idx = Array.prototype.indexOf.call(parent.children, el) + 1;
      parts.unshift(`${tag}:nth-child(${idx})`);
      if (tag === 'body') break;
      el = parent;
    }
    return parts.join(' > ');
  }
  const getEl = (sel) => { try { return document.querySelector(sel); } catch (e) { return null; } };

  function subscribe() {
    db.collection('feedback').where('page', '==', PAGE).onSnapshot((snap) => {
      pins.forEach(p => p.node.remove()); pins = [];
      let i = 0; snap.forEach(doc => { i++; pins.push(makePin(doc.id, doc.data(), i)); });
      reposition();
    }, err => { console.error('[feedback]', err); toast('불러오기 실패 — 규칙을 확인하세요'); });
  }

  function makePin(id, d, num) {
    const node = document.createElement('div'); node.className = 'gfb-pin';
    node.innerHTML = `<button>${num}</button>`;
    const when = d.ts && d.ts.toDate ? d.ts.toDate().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '방금';
    const mine = d.uid === uid;
    node.querySelector('button').onclick = (e) => {
      e.stopPropagation(); const open = node.querySelector('.gfb-pop'); closePops(); if (open) return;
      const pop = document.createElement('div'); pop.className = 'gfb-pop'; pop.style.left = '16px'; pop.style.top = '16px';
      pop.innerHTML = `<div class="who">${esc(d.author || '익명')} <span class="when">· ${when}</span></div><div class="txt">${esc(d.text || '')}</div>${mine ? '<button class="gfb-del">삭제</button>' : ''}`;
      node.appendChild(pop);
      if (mine) { const b = pop.querySelector('.gfb-del'); b.onclick = (ev) => { ev.stopPropagation(); if (b.dataset.c) { db.collection('feedback').doc(id).delete().catch(() => toast('삭제 실패')); } else { b.dataset.c = '1'; b.textContent = '정말 삭제할까요?'; } }; }
    };
    document.body.appendChild(node);
    return { node, sel: d.sel, xr: d.xr, yr: d.yr };
  }

  function reposition() {
    pins.forEach(p => {
      const el = getEl(p.sel); if (!el) { p.node.style.display = 'none'; return; }
      const r = el.getBoundingClientRect(); p.node.style.display = '';
      p.node.style.left = (r.left + window.scrollX + p.xr * r.width) + 'px';
      p.node.style.top = (r.top + window.scrollY + p.yr * r.height) + 'px';
    });
  }

  async function init() {
    try {
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
      firebase.initializeApp(cfg); db = firebase.firestore();
    } catch (e) { console.error('[feedback] Firebase 로드 실패', e); return; }
    styles(); buildBar(); subscribe();
    if (!name) askName();
    window.addEventListener('resize', debounce(reposition, 150));
    window.addEventListener('load', () => setTimeout(reposition, 300));
    setInterval(reposition, 1500);
  }
  init();
})();
