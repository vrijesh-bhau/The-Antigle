/**
 * THE ANTIGLE — main.js (Auto-Updates version)
 *
 * Naya feature:
 * - Updates page pe JSON updates ke saath saath latest videos bhi
 *   automatically "New Video" cards ke roop mein dikhte hain
 * - Koi manual kaam nahi — sirf videos/index.json mein add karo
 */

'use strict';

/* =========================================
   THEME TOGGLE
   ========================================= */
const THEME_KEY = 'antigle_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.classList.toggle('light-mode', theme === 'light');
  document.body.classList.toggle('dark-mode', theme === 'dark');
  document.querySelectorAll('.icon-sun').forEach(el => el.style.display = theme === 'light' ? 'block' : 'none');
  document.querySelectorAll('.icon-moon').forEach(el => el.style.display = theme === 'dark' ? 'block' : 'none');
}

function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
}

function toggleTheme() {
  const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

/* =========================================
   HAMBURGER MENU
   ========================================= */
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('navbar-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }));
}

/* =========================================
   SESSION CACHE
   ========================================= */
const _cache = {};
async function loadJSON(path) {
  if (_cache[path]) return _cache[path];
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _cache[path] = data;
    return data;
  } catch (err) {
    console.warn('[Antigle] Could not load:', path, err.message);
    return null;
  }
}

/* =========================================
   HELPERS
   ========================================= */
function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return str; }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/* =========================================
   TOAST
   ========================================= */
let _toastTimer;
function toast(msg) {
  let el = document.getElementById('_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast';
    el.style.cssText = `position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(60px);
      background:#1a2540;color:#fff;border:1px solid rgba(255,255,255,0.15);padding:0.6rem 1.2rem;
      border-radius:50px;font-size:0.85rem;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.4);
      z-index:9999;transition:transform 0.3s ease,opacity 0.3s ease;opacity:0;font-family:inherit;white-space:nowrap;`;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.transform = 'translateX(-50%) translateY(0)'; el.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.style.transform = 'translateX(-50%) translateY(60px)'; el.style.opacity = '0'; }, 2500);
}

/* =========================================
   VIDEO MODAL
   ========================================= */
let _videoModal = null;

function getYtId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function openVideoModal(video) {
  closeVideoModal();
  const ytId = getYtId(video.youtube);
  const modal = document.createElement('div');
  modal.id = '_videoModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `
    <div id="_modalBg" style="position:absolute;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);"></div>
    <div style="position:relative;z-index:1;width:100%;max-width:860px;background:#1a2540;border-radius:16px;
                overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6);animation:_mIn 0.25s ease;">
      <style>@keyframes _mIn{from{opacity:0;transform:scale(0.93) translateY(18px)}to{opacity:1;transform:none}}</style>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.9rem 1.25rem;border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="font-size:0.9rem;font-weight:600;color:#fff;flex:1;margin-right:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(video.title)}</span>
        <button id="_modalClose" aria-label="Close" style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.08);border:none;color:#aaa;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style="position:relative;aspect-ratio:16/9;background:#000;">
        ${ytId
          ? `<iframe style="position:absolute;inset:0;width:100%;height:100%;border:none;"
               src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0"
               allow="autoplay;encrypted-media;fullscreen" allowfullscreen title="${esc(video.title)}"></iframe>`
          : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#aaa;font-size:0.9rem;">
               Video unavailable. ${video.youtube ? `<a href="${esc(video.youtube)}" target="_blank" rel="noopener" style="color:#63d2db;margin-left:6px;">Open on YouTube ↗</a>` : ''}</div>`}
      </div>
    </div>`;
  document.body.appendChild(modal);
  _videoModal = modal;
  document.body.style.overflow = 'hidden';
  modal.querySelector('#_modalClose').onclick = closeVideoModal;
  modal.querySelector('#_modalBg').onclick = closeVideoModal;
}

function closeVideoModal() {
  if (_videoModal) { _videoModal.remove(); _videoModal = null; document.body.style.overflow = ''; }
}

/* =========================================
   3-DOT MENU
   ========================================= */
const ICONS = {
  link:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  share: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  yt:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
};

function makeMenuBtn(items) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:inline-flex;';
  const btn = document.createElement('button');
  btn.setAttribute('aria-label', 'More options');
  btn.style.cssText = 'width:30px;height:30px;border-radius:50%;border:none;background:transparent;color:rgba(255,255,255,0.45);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;';
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`;
  const drop = document.createElement('div');
  drop.className = '_cardDrop';
  drop.style.cssText = 'position:absolute;top:calc(100% + 4px);right:0;background:#1a2540;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:4px;min-width:148px;box-shadow:0 4px 20px rgba(0,0,0,0.4);z-index:100;display:none;';
  items.forEach(item => {
    const el = document.createElement('button');
    el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;font-size:0.8rem;color:rgba(255,255,255,0.75);cursor:pointer;background:none;border:none;width:100%;font-family:inherit;text-align:left;transition:background 0.15s;';
    el.innerHTML = `${item.icon}<span>${item.label}</span>`;
    el.onmouseover = () => el.style.background = 'rgba(255,255,255,0.07)';
    el.onmouseout = () => el.style.background = 'none';
    el.onclick = e => { e.stopPropagation(); item.action(); drop.style.display = 'none'; };
    drop.appendChild(el);
  });
  btn.onclick = e => {
    e.stopPropagation();
    document.querySelectorAll('._cardDrop').forEach(d => d.style.display = 'none');
    drop.style.display = drop.style.display === 'block' ? 'none' : 'block';
  };
  btn.onmouseover = () => btn.style.background = 'rgba(255,255,255,0.08)';
  btn.onmouseout = () => btn.style.background = 'transparent';
  document.addEventListener('click', () => drop.style.display = 'none');
  wrap.appendChild(btn); wrap.appendChild(drop);
  return wrap;
}

/* =========================================
   FILTER + SEARCH
   ========================================= */
function initFilterSearch(gridId, searchId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  let activeFilter = 'all';
  function run() {
    const q = document.getElementById(searchId)?.value.toLowerCase().trim() || '';
    let n = 0;
    grid.querySelectorAll('[data-cat]').forEach(card => {
      const ok = (activeFilter === 'all' || card.dataset.cat === activeFilter) &&
                 (!q || card.dataset.title?.includes(q) || card.dataset.tags?.includes(q));
      card.style.display = ok ? '' : 'none';
      if (ok) n++;
    });
    let empty = grid.querySelector('._empty');
    if (n === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = '_empty';
        empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:3rem 1rem;color:rgba(255,255,255,0.4);';
        empty.innerHTML = '<p style="font-size:0.9rem;">No results found.</p>';
        grid.appendChild(empty);
      }
    } else empty?.remove();
  }
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      run();
    });
  });
  document.getElementById(searchId)?.addEventListener('input', run);
}

/* =========================================
   INJECT BUTTON STYLES
   ========================================= */
function injectBtnStyles() {
  if (document.getElementById('_abtnstyles')) return;
  const s = document.createElement('style');
  s.id = '_abtnstyles';
  s.textContent = `
    .btn-dl,.btn-ext,.btn-yt-sm{display:inline-flex;align-items:center;gap:6px;padding:0.4rem 0.9rem;
      border-radius:8px;font-size:0.8rem;font-weight:600;text-decoration:none;cursor:pointer;
      transition:all 0.2s;border:none;font-family:inherit;}
    .btn-dl{background:#63d2db;color:#0f1724;}.btn-dl:hover{background:#4ab8c1;transform:translateY(-1px);}
    .btn-ext{background:transparent;color:#63d2db;border:1px solid #63d2db;}
    .btn-ext:hover{background:rgba(99,210,219,0.12);transform:translateY(-1px);}
    .btn-yt-sm{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.75);border:1px solid rgba(255,255,255,0.15);}
    .btn-yt-sm:hover{background:rgba(255,255,255,0.12);}
  `;
  document.head.appendChild(s);
}

function spinnerHtml() {
  return `<div style="grid-column:1/-1;display:flex;justify-content:center;padding:3rem;">
    <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,0.1);border-top-color:#63d2db;border-radius:50%;animation:_sp 0.8s linear infinite;"></div>
    <style>@keyframes _sp{to{transform:rotate(360deg)}}</style></div>`;
}

/* =========================================
   BUILD VIDEO CARD
   ========================================= */
function buildVideoCard(v) {
  const card = document.createElement('div');
  card.className = 'card video-card';
  card.dataset.cat = v.category || 'all';
  card.dataset.title = (v.title || '').toLowerCase();
  card.dataset.tags = (v.tags || []).join(' ').toLowerCase();
  const thumb = v.thumbnail || './assets/images/website_logo.png';
  const tags = (v.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');

  card.innerHTML = `
    <div class="card-thumb" style="position:relative;aspect-ratio:16/9;overflow:hidden;background:#0f1724;cursor:pointer;">
      <img src="${esc(thumb)}" alt="${esc(v.title)}" loading="lazy"
           style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s ease;"
           onerror="this.src='./assets/images/website_logo.png'">
      <div class="play-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);opacity:0;transition:opacity 0.2s;">
        <div style="width:50px;height:50px;background:rgba(255,255,255,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#e05252;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </div>
    <div style="padding:0.85rem 1rem 0.5rem;">
      <div style="font-size:0.88rem;font-weight:600;line-height:1.4;margin-bottom:0.4rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(v.title)}</div>
      <div style="font-size:0.78rem;color:rgba(255,255,255,0.5);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:0.6rem;">${esc(v.description || '')}</div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 1rem 0.7rem;">
      <span style="font-size:0.73rem;color:rgba(255,255,255,0.4);">${formatDate(v.date)}</span>
    </div>
    ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;padding:0 1rem 0.85rem;">${tags}</div>` : ''}
  `;

  const thumb_el = card.querySelector('img');
  const overlay = card.querySelector('.play-overlay');
  card.querySelector('.card-thumb').addEventListener('mouseenter', () => { thumb_el.style.transform = 'scale(1.04)'; overlay.style.opacity = '1'; });
  card.querySelector('.card-thumb').addEventListener('mouseleave', () => { thumb_el.style.transform = ''; overlay.style.opacity = '0'; });

  const footer = card.querySelector('[style*="justify-content:space-between"]');
  footer.appendChild(makeMenuBtn([
    { icon: ICONS.link, label: 'Copy Link', action: () => navigator.clipboard?.writeText(v.youtube || location.href).then(() => toast('Link copied!')).catch(() => toast('Copy failed')) },
    { icon: ICONS.share, label: 'Share', action: () => { if (navigator.share) navigator.share({ title: v.title, url: v.youtube || location.href }); else navigator.clipboard?.writeText(v.youtube || location.href).then(() => toast('Link copied!')); }},
    { icon: ICONS.yt, label: 'Open on YouTube', action: () => window.open(v.youtube, '_blank', 'noopener') }
  ]));

  card.addEventListener('click', e => { if (!e.target.closest('button')) openVideoModal(v); });
  card.style.cursor = 'pointer';
  return card;
}

/* =========================================
   BUILD RESOURCE CARD
   ========================================= */
function buildResourceCard(r) {
  const card = document.createElement('div');
  card.className = 'card resource-card';
  card.dataset.cat = r.category || 'all';
  card.dataset.title = (r.title || '').toLowerCase();
  card.dataset.tags = (r.tags || []).join(' ').toLowerCase();
  const thumb = r.thumbnail || './assets/images/website_logo.png';
  const cat = r.category ? r.category[0].toUpperCase() + r.category.slice(1) : '';
  const isFile = r.download_type === 'file' && r.file;
  const isExt  = r.download_type === 'external' && r.external_link;
  let actionHtml = '';
  if (isFile) actionHtml += `<a href="${esc(r.file)}" download class="btn-dl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</a>`;
  if (isExt)  actionHtml += `<a href="${esc(r.external_link)}" target="_blank" rel="noopener" class="btn-ext"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Get Resource</a>`;
  if (r.youtube) actionHtml += `<a href="${esc(r.youtube)}" target="_blank" rel="noopener" class="btn-yt-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> Watch</a>`;

  card.innerHTML = `
    <div style="position:relative;aspect-ratio:16/9;overflow:hidden;background:#0f1724;">
      <img src="${esc(thumb)}" alt="${esc(r.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s;" onerror="this.src='./assets/images/website_logo.png'">
      ${cat ? `<span style="position:absolute;top:0.6rem;left:0.6rem;padding:0.2rem 0.6rem;background:rgba(15,23,36,0.8);color:#63d2db;border-radius:50px;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;backdrop-filter:blur(4px);">${esc(cat)}</span>` : ''}
    </div>
    <div style="padding:1rem;">
      <div style="font-size:0.88rem;font-weight:600;margin-bottom:0.4rem;line-height:1.4;">${esc(r.title)}</div>
      <div style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin-bottom:0.8rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(r.description || '')}</div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">${actionHtml}</div>
      ${r.note ? `<p style="font-size:0.73rem;color:rgba(255,255,255,0.4);margin-top:0.6rem;padding-top:0.6rem;border-top:1px solid rgba(255,255,255,0.08);">${esc(r.note)}</p>` : ''}
    </div>
  `;
  const img = card.querySelector('img');
  img.parentElement.addEventListener('mouseenter', () => img.style.transform = 'scale(1.04)');
  img.parentElement.addEventListener('mouseleave', () => img.style.transform = '');
  return card;
}

/* =========================================
   VIDEOS PAGE
   ========================================= */
async function initVideos() {
  const grid = document.getElementById('videos-grid');
  if (!grid) return;
  grid.innerHTML = spinnerHtml();
  const videos = await loadJSON('./content/videos/index.json');
  grid.innerHTML = '';
  if (!videos?.length) { grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:rgba(255,255,255,0.4);"><p>No videos yet.</p></div>`; return; }
  injectBtnStyles();
  videos.forEach(v => grid.appendChild(buildVideoCard(v)));
  initFilterSearch('videos-grid', 'video-search');
}

/* =========================================
   RESOURCES PAGE
   ========================================= */
async function initResources() {
  const grid = document.getElementById('resources-grid');
  if (!grid) return;
  grid.innerHTML = spinnerHtml();
  const resources = await loadJSON('./content/resources/index.json');
  grid.innerHTML = '';
  if (!resources?.length) { grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:rgba(255,255,255,0.4);"><p>No resources yet.</p></div>`; return; }
  injectBtnStyles();
  resources.forEach(r => grid.appendChild(buildResourceCard(r)));
  initFilterSearch('resources-grid', 'resource-search');
  const cat = new URLSearchParams(location.search).get('category');
  if (cat) document.querySelector(`[data-filter="${cat}"]`)?.click();
}

/* =========================================
   UPDATES PAGE
   ——————————————————————————————————————————
   AUTO-MERGE: JSON updates + latest videos
   dono ek saath dikhte hain, date ke order mein
   ========================================= */
async function initUpdates() {
  const list = document.getElementById('updates-list');
  if (!list) return;
  list.innerHTML = spinnerHtml().replace('grid-column:1/-1;', '');

  // Dono ek saath fetch karo
  const [updates, videos] = await Promise.all([
    loadJSON('./content/updates/index.json'),
    loadJSON('./content/videos/index.json')
  ]);

  list.innerHTML = '';

  // Videos ko "update" format mein convert karo (naye 5)
  const videoUpdates = (videos || []).slice(0, 5).map(v => ({
    _type:   'video',
    _video:  v,
    id:      'vid-' + v.id,
    title:   '🎬 New Video: ' + v.title,
    date:    v.date,
    summary: v.description || 'Nayi video upload ho gayi! Dekho abhi.',
    featured_image: v.thumbnail,
  }));

  // Merge + date sort (newest first)
  const all = [...(updates || []), ...videoUpdates].sort((a, b) => {
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  if (!all.length) {
    list.innerHTML = `<p style="text-align:center;padding:3rem;color:rgba(255,255,255,0.4);">No updates yet.</p>`;
    return;
  }

  all.forEach(item => {
    const el = document.createElement('div');
    el.className = 'update-item';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    // Video type ke liye cyan accent border
    if (item._type === 'video') {
      el.style.borderLeft = '3px solid #63d2db';
    }

    el.innerHTML = `
      ${item.featured_image
        ? `<img src="${esc(item.featured_image)}" alt="" loading="lazy" class="update-image"
             onerror="this.style.display='none'"
             style="width:110px;height:75px;object-fit:cover;border-radius:8px;flex-shrink:0;">`
        : ''}
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.93rem;font-weight:600;margin-bottom:0.3rem;">${esc(item.title)}</div>
        <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);margin-bottom:0.4rem;
             display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${esc(item.summary || '')}
        </div>
        <div style="font-size:0.73rem;color:rgba(255,255,255,0.35);">${formatDate(item.date)}</div>
      </div>
    `;

    const open = () => {
      if (item._type === 'video') {
        openVideoModal(item._video);  // Video directly khulega!
      } else {
        openUpdateModal(item);
      }
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    list.appendChild(el);
  });

  document.getElementById('modal-close')?.addEventListener('click', closeUpdateModal);
  document.getElementById('modal-overlay')?.addEventListener('click', closeUpdateModal);
}

function openUpdateModal(u) {
  const modal = document.getElementById('update-modal');
  if (!modal) return;
  const titleEl = document.getElementById('modal-title') || modal.querySelector('.modal-title');
  const metaEl  = document.getElementById('modal-meta')  || modal.querySelector('.modal-meta');
  const bodyEl  = document.getElementById('modal-body')  || modal.querySelector('.modal-body');
  if (titleEl) titleEl.textContent = u.title || '';
  if (metaEl)  metaEl.textContent  = formatDate(u.date);
  if (bodyEl)  bodyEl.innerHTML    = u.content || '<p>No content.</p>';
  modal.hidden = false;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

function closeUpdateModal() {
  const modal = document.getElementById('update-modal');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

/* =========================================
   HOME PAGE
   ========================================= */
async function initHome() {
  const featEl = document.getElementById('featured-video');
  if (featEl) {
    const videos = await loadJSON('./content/videos/index.json');
    if (videos?.length) {
      const v = videos[0];
      const card = document.createElement('div');
      card.className = 'card featured-video-card';
      card.style.cssText = 'cursor:pointer;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;padding:1.25rem;';
      card.innerHTML = `
        <div style="position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:10px;background:#0f1724;">
          <img src="${esc(v.thumbnail || './assets/images/website_logo.png')}" alt="${esc(v.title)}"
               loading="lazy" style="width:100%;height:100%;object-fit:cover;"
               onerror="this.src='./assets/images/website_logo.png'">
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);">
            <div style="width:50px;height:50px;background:rgba(255,255,255,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#e05252;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;justify-content:center;gap:0.6rem;">
          <span style="font-size:0.73rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#63d2db;">Latest Video</span>
          <div style="font-size:1.15rem;font-weight:700;line-height:1.4;">${esc(v.title)}</div>
          <div style="font-size:0.82rem;color:rgba(255,255,255,0.5);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${esc(v.description || '')}</div>
          <span style="font-size:0.73rem;color:rgba(255,255,255,0.35);">${formatDate(v.date)}</span>
        </div>
      `;
      card.addEventListener('click', () => openVideoModal(v));
      featEl.innerHTML = '';
      featEl.appendChild(card);
      const mq = window.matchMedia('(max-width:640px)');
      const setGrid = m => { card.style.gridTemplateColumns = m.matches ? '1fr' : '1fr 1fr'; };
      mq.addListener(setGrid); setGrid(mq);
    } else {
      featEl.innerHTML = `<p style="text-align:center;color:rgba(255,255,255,0.4);padding:2rem;">No videos yet.</p>`;
    }
  }

  const updEl = document.getElementById('latest-updates');
  if (updEl) {
    const updates = await loadJSON('./content/updates/index.json');
    updEl.innerHTML = '';
    (updates || []).slice(0, 3).forEach(u => {
      const card = document.createElement('div');
      card.className = 'card'; card.style.cssText = 'padding:1.1rem;cursor:pointer;';
      card.innerHTML = `
        <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);margin-bottom:0.3rem;">${formatDate(u.date)}</div>
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:0.35rem;line-height:1.4;">${esc(u.title)}</div>
        <div style="font-size:0.78rem;color:rgba(255,255,255,0.5);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(u.summary || '')}</div>
        <div style="margin-top:0.65rem;font-size:0.78rem;color:#63d2db;font-weight:600;">Read more →</div>
      `;
      card.onclick = () => location.href = './updates.html';
      updEl.appendChild(card);
    });
  }
}

/* =========================================
   KEYBOARD ESC
   ========================================= */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeVideoModal(); closeUpdateModal(); }
});

/* =========================================
   INIT
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHamburger();
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  const page = location.pathname.split('/').pop() || 'index.html';
  if (!page || page === 'index.html' || page === '') initHome();
  else if (page === 'videos.html')    initVideos();
  else if (page === 'resources.html') initResources();
  else if (page === 'updates.html')   initUpdates();
});
