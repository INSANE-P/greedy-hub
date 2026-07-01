/* 그리디 허브 — 위치 핀 피드백 위젯 (개발용, ?feedback=1)
   Firebase Firestore에 코멘트 저장·실시간 공유. 요소 앵커 방식으로 노트북 간 위치 정확.
   ※ 실서비스 기능 아님 — 디자인 리뷰용 오버레이. */
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

  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });

  function name() {
    let n = localStorage.getItem('gfb_name');
    if (!n) { n = (prompt('피드백에 표시할 이름을 입력하세요') || '익명').trim() || '익명'; localStorage.setItem('gfb_name', n); }
    return n;
  }

  // 요소의 안정적 CSS 경로 (nth-child 기반)
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return 'body';
    const parts = [];
    while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== 'html') {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      const tag = el.tagName.toLowerCase();
      const parent = el.parentElement;
      if (!parent) { parts.unshift(tag); break; }
      const idx = Array.prototype.indexOf.call(parent.children, el) + 1;
      parts.unshift(`${tag}:nth-child(${idx})`);
      if (tag === 'body') break;
      el = parent;
    }
    return parts.join(' > ');
  }
  const getEl = (sel) => { try { return document.querySelector(sel); } catch (e) { return null; } };

  let db, pins = [], placing = false;

  async function init() {
    try {
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`);
      firebase.initializeApp(cfg);
      db = firebase.firestore();
    } catch (e) { console.error('[feedback] Firebase 로드 실패', e); return; }
    buildUI();
    subscribe();
    window.addEventListener('resize', debounce(reposition, 150));
    window.addEventListener('load', () => setTimeout(reposition, 300));
    setInterval(reposition, 1500); // 이미지·레이아웃 변화 대응
  }

  function buildUI() {
    const bar = document.createElement('div');
    bar.id = 'gfb-ui';
    bar.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:60;font-family:inherit';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;background:#0f172a;color:#fff;border-radius:12px;padding:8px 10px;box-shadow:0 6px 18px rgba(0,0,0,.25);font-size:12px">
        <span style="display:inline-flex;align-items:center;gap:6px;font-weight:700"><span style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></span>피드백 모드</span>
        <button id="gfb-add" style="background:#017356;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer">+ 코멘트</button>
        <span id="gfb-name" style="color:#94a3b8;cursor:pointer" title="이름 변경"></span>
        <a href="?feedbackoff=1" style="color:#94a3b8;text-decoration:underline">끄기</a>
      </div>
      <div id="gfb-hint" style="display:none;margin-top:6px;background:#017356;color:#fff;border-radius:8px;padding:6px 10px;font-size:11px">코멘트를 남길 위치를 클릭하세요 (ESC 취소)</div>`;
    document.body.appendChild(bar);
    document.getElementById('gfb-name').textContent = '이름: ' + name();
    document.getElementById('gfb-name').onclick = () => { localStorage.removeItem('gfb_name'); document.getElementById('gfb-name').textContent = '이름: ' + name(); };
    document.getElementById('gfb-add').onclick = () => setPlacing(true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPlacing(false); });
    document.addEventListener('click', onPlaceClick, true);
  }

  function setPlacing(on) {
    placing = on;
    document.body.style.cursor = on ? 'crosshair' : '';
    document.getElementById('gfb-hint').style.display = on ? 'block' : 'none';
  }

  function onPlaceClick(e) {
    if (!placing) return;
    if (e.target.closest('#gfb-ui') || e.target.closest('.gfb-pin')) return;
    e.preventDefault(); e.stopPropagation();
    setPlacing(false);
    const el = e.target, r = el.getBoundingClientRect();
    const xr = r.width ? (e.clientX - r.left) / r.width : 0.5;
    const yr = r.height ? (e.clientY - r.top) / r.height : 0.5;
    const text = prompt('이 위치에 남길 코멘트:');
    if (!text) return;
    db.collection('feedback').add({ page: PAGE, sel: cssPath(el), xr, yr, text: text.slice(0, 1000), author: name(), ts: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(err => { console.error(err); alert('저장 실패 — Firestore/규칙을 확인하세요'); });
  }

  function subscribe() {
    db.collection('feedback').where('page', '==', PAGE).onSnapshot((snap) => {
      pins.forEach(p => p.node.remove());
      pins = [];
      let i = 0;
      snap.forEach(doc => { i++; pins.push(makePin(doc.id, doc.data(), i)); });
      reposition();
    }, err => console.error('[feedback]', err));
  }

  function makePin(id, d, num) {
    const node = document.createElement('div');
    node.className = 'gfb-pin';
    node.style.cssText = 'position:absolute;z-index:55;transform:translate(-50%,-50%)';
    node.innerHTML = `<button style="width:26px;height:26px;border-radius:50% 50% 50% 2px;background:#017356;color:#fff;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:11px;font-weight:800;cursor:pointer">${num}</button>`;
    const pop = document.createElement('div');
    pop.style.cssText = 'display:none;position:absolute;left:16px;top:16px;width:240px;background:#fff;color:#0f172a;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.2);padding:12px;font-size:13px;z-index:57';
    const when = d.ts && d.ts.toDate ? d.ts.toDate().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '방금';
    pop.innerHTML = `<div style="font-weight:700;margin-bottom:2px">${esc(d.author || '익명')} <span style="font-weight:400;color:#94a3b8;font-size:11px">· ${when}</span></div>
      <div style="white-space:pre-wrap;line-height:1.45">${esc(d.text || '')}</div>
      <button data-del style="margin-top:8px;color:#ef4444;background:none;border:0;font-size:12px;cursor:pointer">삭제</button>`;
    node.appendChild(pop);
    node.firstChild.onclick = (e) => { e.stopPropagation(); const open = pop.style.display === 'block'; document.querySelectorAll('.gfb-pin > div').forEach(p => p.style.display = 'none'); pop.style.display = open ? 'none' : 'block'; };
    pop.querySelector('[data-del]').onclick = (e) => { e.stopPropagation(); if (confirm('이 코멘트를 삭제할까요?')) db.collection('feedback').doc(id).delete(); };
    document.body.appendChild(node);
    return { node, sel: d.sel, xr: d.xr, yr: d.yr };
  }

  function reposition() {
    pins.forEach(p => {
      const el = getEl(p.sel);
      if (!el) { p.node.style.display = 'none'; return; }
      const r = el.getBoundingClientRect();
      p.node.style.display = '';
      p.node.style.left = (r.left + window.scrollX + p.xr * r.width) + 'px';
      p.node.style.top = (r.top + window.scrollY + p.yr * r.height) + 'px';
    });
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

  init();
})();
