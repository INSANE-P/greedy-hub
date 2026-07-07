/* 그리디 허브 — 위치 핀 피드백 위젯 (MVP 미리보기 전용, 개발용)
   · 항상 뜨는 토글(끄면 핀만 숨김, 다시 켜기 가능) · Firebase는 켤 때만 로드
   · 커스텀 입력 UI(브라우저 팝업 미사용) · 삭제는 본인 글만 · 요소 앵커로 위치 정확 */
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
  const G = "#017356";
  const ICON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 9.5h9M7.5 13h5.5M21 11.4a8.5 8.5 0 0 1-11.9 7.8L4 20.5l1.3-4.9A8.5 8.5 0 1 1 21 11.4Z"/></svg>`;

  const uid = localStorage.getItem('gfb_uid') || (() => { const u = 'u' + Math.random().toString(36).slice(2, 10); localStorage.setItem('gfb_uid', u); return u; })();
  let name = localStorage.getItem('gfb_name') || '';
  let on = localStorage.getItem('gfb_on') === '1';
  if (new URLSearchParams(location.search).has('fb')) { on = true; localStorage.setItem('gfb_on', '1'); } // 보드에서 핀으로 진입
  let db = null, fbLoading = null, unsub = null, pins = [], placing = false, ui, jumped = false;

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const getEl = (sel) => { try { return document.querySelector(sel); } catch (e) { return null; } };

  function styles() {
    document.head.insertAdjacentHTML('beforeend', `<style>
    #gfb-ui{position:fixed;left:16px;bottom:16px;z-index:70;font:600 13px/1 inherit}
    .gfb-fab,.gfb-bar{display:inline-flex;align-items:center;background:#fff;color:#0f172a;border:1px solid #e7ebf0;box-shadow:0 8px 24px rgba(15,23,42,.14);border-radius:14px}
    .dark .gfb-fab,.dark .gfb-bar{background:#1e293b;color:#e2e8f0;border-color:#33415580}
    .gfb-fab{gap:7px;padding:9px 14px;cursor:pointer}
    .gfb-fab:hover{border-color:${G}55}
    .gfb-fab .i{color:${G};display:flex}
    .gfb-bar{gap:4px;padding:6px 6px 6px 12px}
    .gfb-bar .i{color:${G};display:flex;margin-right:4px}
    .gfb-bar .lbl{font-weight:700;color:#475569;margin-right:6px}
    .dark .gfb-bar .lbl{color:#94a3b8}
    .gfb-add{background:${G};color:#fff;border:0;border-radius:9px;padding:8px 13px;font-weight:800;cursor:pointer;font-size:13px}
    .gfb-add:hover{filter:brightness(1.07)}
    .gfb-add.on{background:#ef4444}
    .gfb-nm{font-size:12px;font-weight:700;color:${G};background:${G}12;border-radius:8px;padding:6px 9px;margin:0 2px;cursor:pointer}
    .gfb-cl{background:transparent;border:0;color:#94a3b8;cursor:pointer;padding:6px 8px;border-radius:8px;font-size:13px}
    .gfb-cl:hover{background:#0f172a0a}
    .gfb-hint{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:71;background:${G};color:#fff;border-radius:999px;padding:8px 16px;font:700 12px/1 inherit;box-shadow:0 8px 22px rgba(0,0,0,.18)}
    .gfb-pin{position:absolute;z-index:66;transform:translate(-50%,-100%)}
    .gfb-pin>button{width:26px;height:26px;border-radius:50% 50% 50% 4px;background:${G};color:#fff;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.28);font:800 11px/1 inherit;cursor:pointer}
    .gfb-card{position:absolute;z-index:68;width:250px;background:#fff;color:#0f172a;border:1px solid #e7ebf0;border-radius:14px;box-shadow:0 16px 44px rgba(15,23,42,.22);padding:14px;font:400 13px/1.55 inherit}
    .dark .gfb-card{background:#1e293b;color:#e2e8f0;border-color:#33415580}
    .gfb-card .who{font-weight:800;margin-bottom:3px}
    .gfb-card .who span{font-weight:400;color:#94a3b8;font-size:11px}
    .gfb-card .txt{white-space:pre-wrap;word-break:break-word}
    .gfb-card .del{margin-top:11px;color:#ef4444;background:none;border:0;font-size:12px;font-weight:700;cursor:pointer;padding:0}
    .gfb-card textarea{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font:inherit;resize:vertical;min-height:70px;outline:none;background:#f8fafc}
    .dark .gfb-card textarea{background:#0f172a;border-color:#334155;color:#e2e8f0}
    .gfb-card textarea:focus{border-color:${G}}
    .gfb-acts{display:flex;gap:4px;justify-content:flex-end;margin-top:10px;align-items:center}
    .gfb-ok{background:${G};color:#fff;border:0;border-radius:9px;padding:7px 14px;font-weight:800;cursor:pointer;font-size:13px}
    .gfb-no{background:transparent;color:#64748b;border:0;cursor:pointer;font-size:13px;padding:7px 10px}
    .gfb-ov{position:fixed;inset:0;z-index:80;background:rgba(15,23,42,.5);display:grid;place-items:center}
    .gfb-md{width:330px;max-width:90vw;background:#fff;color:#0f172a;border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.35);font:400 14px/1.5 inherit}
    .dark .gfb-md{background:#1e293b;color:#e2e8f0}
    .gfb-md h3{margin:0 0 6px;font-size:19px;font-weight:800}
    .gfb-md p{margin:0 0 16px;color:#64748b;font-size:13px}
    .gfb-md input{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:12px;padding:12px;font:inherit;outline:none;background:#f8fafc}
    .dark .gfb-md input{background:#0f172a;border-color:#334155;color:#e2e8f0}
    .gfb-md input:focus{border-color:${G}}
    .gfb-toast{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:90;background:#0f172a;color:#fff;border-radius:10px;padding:11px 16px;font:600 13px/1 inherit;box-shadow:0 12px 34px rgba(0,0,0,.3);opacity:0;transition:opacity .2s}
    </style>`);
  }

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'gfb-toast'; t.textContent = msg; document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2800);
  }

  function askName(after) {
    const ov = document.createElement('div'); ov.className = 'gfb-ov';
    ov.innerHTML = `<div class="gfb-md"><h3>표시할 이름</h3><p>누구 코멘트인지 보이게 이름을 정해주세요.</p>
      <input placeholder="예: 찬빈" value="${esc(name)}" maxlength="20"/>
      <div class="gfb-acts" style="margin-top:18px"><button class="gfb-ok">저장</button></div></div>`;
    document.body.appendChild(ov);
    const inp = ov.querySelector('input'); inp.focus(); inp.select();
    const done = () => { const v = inp.value.trim(); if (!v) return inp.focus(); name = v; localStorage.setItem('gfb_name', v); ov.remove(); render(); if (after) after(); };
    ov.querySelector('.gfb-ok').onclick = done;
    inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
    ov.onclick = (e) => { if (e.target === ov && name) ov.remove(); };
  }

  function render() {
    if (!ui) { ui = document.createElement('div'); ui.id = 'gfb-ui'; document.body.appendChild(ui); }
    if (!on) {
      ui.innerHTML = `<button class="gfb-fab"><span class="i">${ICON}</span>코멘트</button>`;
      ui.querySelector('.gfb-fab').onclick = () => setOn(true);
    } else {
      ui.innerHTML = `<div class="gfb-bar"><span class="i">${ICON}</span><span class="lbl">코멘트</span>
        <button class="gfb-add ${placing ? 'on' : ''}">${placing ? '취소' : '+ 남기기'}</button>
        <a class="gfb-cl" href="feedback-board.html" title="피드백 목록" style="text-decoration:none">목록</a>
        <span class="gfb-nm">${name ? esc(name) : '이름'}</span>
        <button class="gfb-cl" title="접기">▾</button></div>`;
      ui.querySelector('.gfb-add').onclick = () => { if (!name) return askName(() => setPlacing(true)); setPlacing(!placing); };
      ui.querySelector('.gfb-nm').onclick = () => askName();
      ui.querySelector('.gfb-cl').onclick = () => setOn(false);
    }
  }

  function setOn(v) {
    on = v; localStorage.setItem('gfb_on', v ? '1' : '0');
    if (!v) { setPlacing(false); clearPins(); if (unsub) { unsub(); unsub = null; } render(); return; }
    render();
    ensureFirebase().then(() => { if (on) subscribe(); }).catch(() => { toast('연결 실패 — Firestore를 확인하세요'); });
    if (!name) askName();
  }

  function ensureFirebase() {
    if (db) return Promise.resolve();
    if (fbLoading) return fbLoading;
    fbLoading = (async () => {
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
      firebase.initializeApp(cfg); db = firebase.firestore();
    })();
    return fbLoading;
  }

  let hint;
  function setPlacing(v) {
    placing = v; document.body.style.cursor = v ? 'crosshair' : '';
    if (on) render();
    if (v && !hint) { hint = document.createElement('div'); hint.className = 'gfb-hint'; hint.textContent = '코멘트 남길 위치를 클릭 · ESC 취소'; document.body.appendChild(hint); }
    if (!v && hint) { hint.remove(); hint = null; }
  }

  function onPlaceClick(e) {
    if (!placing) return;
    if (e.target.closest('#gfb-ui') || e.target.closest('.gfb-pin') || e.target.closest('.gfb-card')) return;
    e.preventDefault(); e.stopPropagation(); setPlacing(false);
    const el = e.target, r = el.getBoundingClientRect();
    openComposer(e.clientX, e.clientY, { sel: cssPath(el), xr: r.width ? (e.clientX - r.left) / r.width : .5, yr: r.height ? (e.clientY - r.top) / r.height : .5 });
  }

  function openComposer(cx, cy, a) {
    closeCards();
    const c = document.createElement('div'); c.className = 'gfb-card';
    c.innerHTML = `<textarea placeholder="이 위치에 대한 의견을 적어주세요"></textarea>
      <div class="gfb-acts"><button class="gfb-no">취소</button><button class="gfb-ok">남기기</button></div>`;
    document.body.appendChild(c);
    const x = Math.min(cx, window.innerWidth - 262), y = Math.min(cy, window.innerHeight - 170);
    c.style.left = (x + window.scrollX) + 'px'; c.style.top = (y + window.scrollY) + 'px';
    const ta = c.querySelector('textarea'); ta.focus();
    c.querySelector('.gfb-no').onclick = () => c.remove();
    const save = () => {
      const text = ta.value.trim(); if (!text) return ta.focus();
      c.remove();
      db.collection('feedback').add({ page: PAGE, sel: a.sel, xr: a.xr, yr: a.yr, text: text.slice(0, 1000), author: name, uid, ts: firebase.firestore.FieldValue.serverTimestamp() })
        .catch(err => { console.error(err); toast('저장 실패 — 규칙/데이터베이스 확인'); });
    };
    c.querySelector('.gfb-ok').onclick = save;
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); };
  }
  const closeCards = () => document.querySelectorAll('.gfb-card').forEach(n => { if (!n.querySelector('textarea')) n.remove(); else n.remove(); });

  function subscribe() {
    if (unsub) unsub();
    unsub = db.collection('feedback').where('page', '==', PAGE).onSnapshot((snap) => {
      clearPins(); let i = 0; snap.forEach(doc => { i++; pins.push(makePin(doc.id, doc.data(), i)); }); reposition(); maybeJump();
    }, err => { console.error('[feedback]', err); toast('불러오기 실패 — 규칙 확인'); });
  }
  const clearPins = () => { pins.forEach(p => p.node.remove()); pins = []; };

  function makePin(id, d, num) {
    const node = document.createElement('div'); node.className = 'gfb-pin'; node.innerHTML = `<button>${num}</button>`;
    const when = d.ts && d.ts.toDate ? d.ts.toDate().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '방금';
    const mine = d.uid === uid;
    node.querySelector('button').onclick = (e) => {
      e.stopPropagation(); const has = node.querySelector('.gfb-card'); document.querySelectorAll('.gfb-pin .gfb-card').forEach(n => n.remove()); if (has) return;
      const pop = document.createElement('div'); pop.className = 'gfb-card'; pop.style.left = '15px'; pop.style.top = '0';
      pop.innerHTML = `<div class="who">${esc(d.author || '익명')} <span>· ${when}</span></div><div class="txt">${esc(d.text || '')}</div>${mine ? '<button class="del">삭제</button>' : ''}`;
      node.appendChild(pop);
      if (mine) { const b = pop.querySelector('.del'); b.onclick = (ev) => { ev.stopPropagation(); if (b.dataset.c) db.collection('feedback').doc(id).delete().catch(() => toast('삭제 실패')); else { b.dataset.c = '1'; b.textContent = '정말 삭제?'; } }; }
    };
    document.body.appendChild(node); return { node, sel: d.sel, xr: d.xr, yr: d.yr, id };
  }

  function maybeJump() {
    if (jumped) return;
    const id = new URLSearchParams(location.search).get('fb'); if (!id) return;
    const p = pins.find(x => x.id === id); if (!p) return;
    jumped = true;
    const el = getEl(p.sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      reposition();
      const btn = p.node.querySelector('button'); if (btn) { btn.click(); btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 500, iterations: 2 }); }
    }, 500);
  }

  function reposition() {
    pins.forEach(p => { const el = getEl(p.sel); if (!el) { p.node.style.display = 'none'; return; } const r = el.getBoundingClientRect(); p.node.style.display = ''; p.node.style.left = (r.left + window.scrollX + p.xr * r.width) + 'px'; p.node.style.top = (r.top + window.scrollY + p.yr * r.height) + 'px'; });
  }

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return 'body'; const parts = [];
    while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== 'html') {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      const tag = el.tagName.toLowerCase(), parent = el.parentElement; if (!parent) { parts.unshift(tag); break; }
      parts.unshift(`${tag}:nth-child(${Array.prototype.indexOf.call(parent.children, el) + 1})`); if (tag === 'body') break; el = parent;
    }
    return parts.join(' > ');
  }

  // 시작
  styles(); render();
  document.addEventListener('click', onPlaceClick, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPlacing(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.gfb-pin') && !e.target.closest('#gfb-ui')) document.querySelectorAll('.gfb-pin .gfb-card').forEach(n => n.remove()); });
  window.addEventListener('resize', debounce(reposition, 150));
  window.addEventListener('load', () => setTimeout(reposition, 300));
  setInterval(reposition, 1500);
  if (on) setOn(true);
})();
