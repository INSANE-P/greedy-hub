/* 그리디 허브 프로토타입 — 공통 테마 · 레이아웃 · 역할 전환기
   ※ 로고/브랜드 색은 여기 한 곳만 바꾸면 전 페이지에 반영됨. */

// 1) 브랜드 색 — 그리디 로고 그린
window.GREEDY_BRAND = { DEFAULT: '#017356', soft: '#02916C', deep: '#014C39' };

// 2) Tailwind 설정
window.tailwind = window.tailwind || {};
tailwind.config = {
  darkMode: 'class',
  theme: { extend: {
    colors: { brand: window.GREEDY_BRAND },
    fontFamily: { sans: ['Pretendard','system-ui','-apple-system','Segoe UI','sans-serif'] },
  }},
};

// 3) 로고
function greedyLogo(size = 8) {
  return `<img src="assets/logo.png" alt="그리디" class="w-${size} h-${size} rounded-full object-cover" />`;
}

// 4) 역할(페르소나) — 전환기로 바꿈
const ROLES = {
  guest:    { label: '외부인',         name: '방문자', initial: '?', desc: '비동아리원 (지원 전)' },
  member:   { label: '멤버',           name: '박지호', initial: '홍', desc: 'FE 4기 멤버' },
  reviewer: { label: '리뷰어',         name: '정우진', initial: '정', desc: 'FE 4기 리뷰어 (운영진 아님)' },
  staff:    { label: '운영진',         name: '강민서', initial: '송', desc: 'FE 리드·메인테이너' },
  alumni:   { label: '이전 기수 멤버', name: '윤하준', initial: '박', desc: 'FE 2기 OB (졸업)' },
};
function getRole() { return localStorage.getItem('greedy_role') || 'member'; }
function setRole(r) { localStorage.setItem('greedy_role', r); location.reload(); }

// 역할별로 보이는 탭
const NAV = [
  ['index.html','홈',       ['guest','member','reviewer','staff','alumni']],
  ['missions.html','미션',  ['member','staff']],
  ['review.html','리뷰',    ['reviewer','staff']],
  ['study.html','스터디',   ['member','reviewer','staff']],
  ['blog.html','블로그',    ['guest','member','reviewer','staff','alumni']],
  ['projects.html','프로젝트',['guest','member','reviewer','staff','alumni']],
  ['gallery.html','활동',   ['guest','member','reviewer','staff','alumni']],
  ['member.html','멤버',    ['guest','member','reviewer','staff','alumni']],
  ['admin.html','운영진',   ['staff']],
];

// 화면별 역할 배지
function roleBadge(role) {
  const c = {
    '멤버': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    '리뷰어': 'bg-brand/10 text-brand',
    '운영진': 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    '공개': 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  };
  return `<span class="text-xs font-semibold px-2.5 py-1 rounded-full ${c[role]||''}" title="이 화면은 '${role}' 권한에게 보입니다">${role} 화면</span>`;
}

// 5) 공통 네비/푸터/전환기 주입
function renderChrome(active) {
  const role = getRole(), p = ROLES[role];
  // MVP 미리보기 모드 (회의용) — ?mvp=1 로 켜고 ?full=1 로 끔 (세션 내 유지)
  const _q = new URLSearchParams(location.search);
  if (_q.has('mvp')) sessionStorage.setItem('greedy_mvp','1');
  if (_q.has('full')) sessionStorage.removeItem('greedy_mvp');
  const MVP = sessionStorage.getItem('greedy_mvp') === '1';
  const MVP_TABS = ['index.html','member.html','study.html','projects.html','gallery.html'];
  const tabs = MVP ? NAV.filter(([h]) => MVP_TABS.includes(h)) : NAV.filter(([,,roles]) => roles.includes(role));
  const applyBtn = MVP ? '' : `<a href="recruit.html" class="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand-soft" title="지원 폼으로 이동">지원하기</a>`;
  const accountHtml = role === 'guest'
    ? `<a href="#" class="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ring-1 ring-slate-900/10 dark:ring-white/15 hover:bg-slate-200/60 dark:hover:bg-white/10" title="GitHub로 로그인 (외부인은 로그인 후 멤버 기능 사용)">로그인</a>`
    : `<a href="member-profile.html" class="hidden sm:grid place-items-center w-9 h-9 rounded-full bg-slate-300 dark:bg-white/20 text-sm font-medium" title="${p.name} · ${p.desc} — 내 이력서로 이동">${p.name[0]}</a>`;

  const nav = document.getElementById('nav');
  if (nav) nav.outerHTML = `
  <header class="sticky top-0 z-30 backdrop-blur bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-900/5 dark:border-white/10">
    <nav class="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
      <a href="index.html" class="flex items-center gap-2 font-bold text-lg">${greedyLogo(8)}<span>그리디 <span class="text-brand">허브</span></span></a>
      <div class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
        ${tabs.map(([h,t])=>`<a href="${h}" class="hover:text-brand ${h===active?'text-brand font-semibold':''}">${t}</a>`).join('')}
      </div>
      <div class="flex items-center gap-2">
        <button onclick="document.documentElement.classList.toggle('dark')" class="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10" title="다크모드">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/></svg>
        </button>
        ${accountHtml}
        ${applyBtn}
      </div>
    </nav>
  </header>`;

  const footer = document.getElementById('footer');
  if (footer) footer.outerHTML = `
  <footer class="border-t border-slate-900/5 dark:border-white/10 mt-16">
    <div class="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
      <div class="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">${greedyLogo(7)} 그리디 허브</div>
      <div class="flex gap-5"><a href="#" class="hover:text-brand">GitHub</a><a href="#" class="hover:text-brand">Discord</a></div>
      <div>© 2026 GREEDY · 세종대학교</div>
    </div>
  </footer>`;

  // 역할별 콘텐츠 표시/숨김 (data-roles="member,staff" 처럼 지정)
  document.querySelectorAll('[data-roles]').forEach(el => {
    if (!el.getAttribute('data-roles').split(',').includes(role)) el.style.display = 'none';
  });

  // MVP 미리보기: 비-MVP 요소 숨김 / MVP 전용 요소 표시
  document.querySelectorAll('[data-mvp-hide]').forEach(el => { if (MVP) el.style.display = 'none'; });
  document.querySelectorAll('[data-mvp-only]').forEach(el => { if (!MVP) el.style.display = 'none'; });

  // 우측 하단 따라다니는 프로토타입 역할 전환기
  const opts = Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${k===role?'selected':''}>${v.label} · ${v.name}</option>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
  <div class="fixed bottom-3 right-3 z-50 select-none">
    <div class="rounded-xl bg-slate-900/90 text-white shadow-lg ring-1 ring-white/10 px-3 py-2 text-xs">
      <div class="flex items-center gap-1.5 font-semibold mb-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>프로토타입 · 역할 전환</div>
      <select onchange="setRole(this.value)" class="w-full bg-slate-800 text-white rounded-md px-2 py-1 outline-none cursor-pointer" title="역할을 바꾸면 보이는 탭과 시점이 달라집니다">
        ${opts}
      </select>
      <div class="mt-1 text-[10px] text-slate-400">현재: ${p.desc}</div>
      ${MVP
        ? `<div class="mt-1.5 pt-1.5 border-t border-white/10 text-[10px]"><span class="text-emerald-300 font-semibold">● MVP 미리보기</span> · <a href="?full=1" class="underline text-slate-300">전체 보기</a></div>`
        : `<div class="mt-1.5 pt-1.5 border-t border-white/10 text-[10px]"><a href="?mvp=1" class="underline text-slate-400">MVP 미리보기</a></div>`}
    </div>
  </div>`);

  // 피드백 핀 코멘트 위젯 — MVP 미리보기에서 항상 로드(위젯이 켜기/끄기 토글 제공)
  if (MVP && !window.__gfbInjected) {
    window.__gfbInjected = true;
    const fs = document.createElement('script'); fs.src = 'assets/feedback.js'; document.body.appendChild(fs);
  }
}
