/* ============================================================
   The Antigle — main.js  (v2)
   ============================================================ */
'use strict';

const THEME_KEY   = 'antigle_theme';
const VIDEOS_JSON = './content/videos/index.json';
const RES_JSON    = './content/resources/index.json';
const UPD_JSON    = './content/updates/index.json';
const PER_PAGE    = 3;

/* ─── JSON cache ──────────────────────────────────────────── */
const _cache = {};
async function loadJSON(path) {
  if (_cache[path]) return _cache[path];
  try {
    const r = await fetch(path + '?t=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    _cache[path] = d;
    return d;
  } catch (e) {
    console.warn('[Antigle] loadJSON failed:', path, e.message);
    return [];
  }
}

/* ─── Utils ───────────────────────────────────────────────── */
function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(s) {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'}); }
  catch { return s; }
}
function ytId(url) {
  const m = String(url||'').match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function guessCategory(title, desc) {
  const t = (title + ' ' + (desc||'')).toLowerCase();
  if (/tutorial|how to|kaise|guide|step by step/.test(t)) return 'tutorials';
  if (/tips|tricks|top \d|best/.test(t))                  return 'tips';
  return 'minecraft';
}

/* ─── SVG icons ───────────────────────────────────────────── */
const ICO = {
  play : (sz=52)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  dl   : ()=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  ext  : ()=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  img  : ()=>`<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  news : ()=>`<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
};

/* ─── THEME ───────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });
}

/* ─── HAMBURGER ───────────────────────────────────────────── */
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('navbar-nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open'); btn.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') { nav.classList.remove('open'); btn.classList.remove('open'); }
  });
}

/* ─── FOOTER YEAR ─────────────────────────────────────────── */
function updateFooterYear() {
  document.querySelectorAll('.footer-copyright p').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\d{4}/, new Date().getFullYear());
  });
}

/* ─── MODAL ───────────────────────────────────────────────── */
let overlay = null, modalBox = null;

function ensureModal() {
  if (overlay) return;
  overlay  = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true');
  modalBox = document.createElement('div');
  modalBox.className = 'modal';
  overlay.appendChild(modalBox);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target===overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key==='Escape' && overlay.classList.contains('open')) closeModal();
  });
}

function closeModal() {
  overlay?.classList.remove('open');
  setTimeout(() => { if (modalBox) modalBox.innerHTML=''; }, 300);
}

function openVideoModal(v) {
  ensureModal();
  const vid = v.id || ytId(v.youtube||'');
  if (!vid) return;
  modalBox.innerHTML = `
    <button class="modal-close" aria-label="Close">&times;</button>
    <div class="modal-video-wrap">
      <iframe src="https://www.youtube.com/embed/${esc(vid)}?autoplay=1&rel=0&loop=1&playlist=${esc(vid)}"
        allow="autoplay;fullscreen;picture-in-picture" allowfullscreen loading="lazy"
        title="${esc(v.title||'')}"></iframe>
    </div>
    <div class="modal-video-info">
      <div class="modal-video-title">${esc(v.title||'')}</div>
      <div class="modal-video-date">${fmtDate(v.date)}</div>
      <div class="modal-video-desc">${esc(v.description||'')}</div>
      <div class="modal-video-actions">
        <a href="${esc(v.youtube||'#')}" target="_blank" rel="noopener noreferrer" class="btn btn-youtube">
          ${ICO.play(16)} Watch on YouTube
        </a>
      </div>
    </div>`;
  modalBox.querySelector('.modal-close').addEventListener('click', closeModal);
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function openUpdateModal(u) {
  ensureModal();
  modalBox.innerHTML = `
    <button class="modal-close" aria-label="Close">&times;</button>
    ${u.featured_image ? `<div class="modal-update-img"><img src="${esc(u.featured_image)}" alt="" loading="lazy"></div>` : ''}
    <div class="modal-update-body">
      <div class="modal-update-title">${esc(u.title||'')}</div>
      <div class="modal-update-date">${fmtDate(u.date)}</div>
      <div class="modal-update-content">${u.content||''}</div>
    </div>`;
  modalBox.querySelector('.modal-close').addEventListener('click', closeModal);
  requestAnimationFrame(() => overlay.classList.add('open'));
}

/* ─── CARD BUILDERS ───────────────────────────────────────── */
function videoCard(v) {
  const el = document.createElement('div');
  el.className = 'video-card';
  el.setAttribute('data-category', v.category||'minecraft');
  const tags = (v.tags||[]).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
  el.innerHTML = `
    <div class="video-thumb">
      <img src="${esc(v.thumbnail||`https://i.ytimg.com/vi/${esc(v.id||'')}/hqdefault.jpg`)}"
           alt="${esc(v.title||'')}" loading="lazy"
           onerror="this.src='https://i.ytimg.com/vi/${esc(v.id||'')}/hqdefault.jpg'">
      <div class="video-play-btn" aria-hidden="true">${ICO.play()}</div>
      <span class="video-badge">${esc(v.category||'minecraft')}</span>
    </div>
    <div class="video-info">
      <div class="video-title">${esc(v.title||'')}</div>
      <div class="video-desc">${esc(v.description||'')}</div>
      <div class="video-meta"><span>${fmtDate(v.date)}</span></div>
      ${tags?`<div class="video-tags">${tags}</div>`:''}
    </div>`;
  el.addEventListener('click', ()=>openVideoModal(v));
  return el;
}

function resourceCard(r) {
  const el = document.createElement('div');
  el.className = 'resource-card';
  el.setAttribute('data-category', r.category||'gaming');

  const thumb = r.thumbnail
    ? `<div class="resource-thumb"><img src="${esc(r.thumbnail)}" alt="${esc(r.title||'')}" loading="lazy"></div>`
    : `<div class="resource-thumb"><div class="resource-thumb-placeholder">${ICO.img()}</div></div>`;

  let dlBtn = '';
  if (r.download_type==='file' && r.file)
    dlBtn = `<a href="${esc(r.file)}" download class="resource-btn resource-btn-primary">${ICO.dl()} Download</a>`;
  else if (r.external_link)
    dlBtn = `<a href="${esc(r.external_link)}" target="_blank" rel="noopener noreferrer" class="resource-btn resource-btn-primary">${ICO.ext()} Download</a>`;

  const ytBtn = r.youtube
    ? `<a href="${esc(r.youtube)}" target="_blank" rel="noopener noreferrer" class="resource-btn resource-btn-secondary">${ICO.play(14)} Watch</a>` : '';

  const note = r.note ? `<div class="resource-note">${esc(r.note)}</div>` : '';
  const tags = (r.tags||[]).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join('');

  el.innerHTML = `
    ${thumb}
    <div class="resource-info">
      <div class="resource-title">${esc(r.title||'')}</div>
      <div class="resource-desc">${esc(r.description||'')}</div>
      ${note}
      ${tags?`<div class="video-tags">${tags}</div>`:''}
      <div class="resource-actions">${dlBtn}${ytBtn}</div>
    </div>`;
  return el;
}

function updateCard(u) {
  const el = document.createElement('div');
  el.className = 'update-card';
  const img = u.featured_image
    ? `<div class="update-image"><img src="${esc(u.featured_image)}" alt="" loading="lazy"></div>`
    : `<div class="update-image"><div class="update-image-placeholder">${ICO.news()}</div></div>`;
  el.innerHTML = `
    ${img}
    <div class="update-info">
      <div class="update-date">${fmtDate(u.date)}</div>
      <div class="update-title">${esc(u.title||'')}</div>
      <div class="update-summary">${esc(u.summary||'')}</div>
      <button class="update-read-more">Read More →</button>
    </div>`;
  const rm = el.querySelector('.update-read-more');
  rm.addEventListener('click', e=>{ e.stopPropagation(); openUpdateModal(u); });
  el.addEventListener('click', ()=>openUpdateModal(u));
  return el;
}

/* ─── FILTERS + SEARCH ─────────────────────────────────────── */
function setupFilters(gridEl, searchEl) {
  let filter='all', query='';
  function apply() {
    let vis=0;
    gridEl.querySelectorAll('[data-category]').forEach(c=>{
      const catMatch = filter==='all' || c.getAttribute('data-category')===filter;
      const title    = (c.querySelector('.video-title,.resource-title')?.textContent||'').toLowerCase();
      const qMatch   = !query || title.includes(query);
      const show     = catMatch && qMatch;
      c.style.display = show ? '' : 'none';
      if(show) vis++;
    });
    const emptyEl = gridEl.querySelector('.empty-state');
    if(vis===0 && !emptyEl){
      const d=document.createElement('div'); d.className='empty-state';
      d.innerHTML=`${ICO.img()}<h3>Nothing found</h3><p>Try a different filter or search term.</p>`;
      gridEl.appendChild(d);
    } else if(vis>0 && emptyEl) emptyEl.remove();
  }

  document.querySelectorAll('.filter-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      filter = b.dataset.filter||'all';
      apply();
    });
  });

  searchEl?.addEventListener('input', ()=>{ query=searchEl.value.trim().toLowerCase(); apply(); });
}

/* ─── FEATURED CARD HTML ─────────────────────────────────── */
function featuredHTML(v, label) {
  const id = v.id||ytId(v.youtube||'')||'';
  return `
    <div class="featured-video-card">
      <div class="featured-thumb" role="button" tabindex="0" aria-label="Play ${esc(v.title||'')}">
        <img src="${esc(v.thumbnail||`https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg`)}"
             alt="${esc(v.title||'')}" loading="lazy">
        <div class="featured-thumb-overlay">${ICO.play(60)}</div>
      </div>
      <div class="featured-info">
        <div class="featured-label">${label}</div>
        <div class="featured-title">${esc(v.title||'')}</div>
        <div class="featured-desc">${esc(v.description||'')}</div>
        <div class="featured-date">${fmtDate(v.date)}</div>
        <div style="margin-top:.5rem">
          <a href="${esc(v.youtube||'#')}" target="_blank" rel="noopener noreferrer"
             class="btn btn-youtube" style="font-size:.85rem;padding:.5rem 1rem">
            ${ICO.play(16)} Watch on YouTube
          </a>
        </div>
      </div>
    </div>`;
}

/* ─── HOME ─────────────────────────────────────────────────── */
async function initHome() {
  // Random featured video
  const featEl = document.getElementById('featured-video');
  if (featEl) {
    const videos = await loadJSON(VIDEOS_JSON);
    if (videos.length) {
      const v = videos[Math.floor(Math.random() * videos.length)];
      featEl.innerHTML = featuredHTML(v, '🎮 Featured Video');
      featEl.querySelector('.featured-thumb').addEventListener('click', ()=>openVideoModal(v));
    } else {
      featEl.innerHTML = `<div class="empty-state">${ICO.img()}<h3>No videos yet</h3><p>Run the GitHub Action to auto-fetch videos from your channel.</p></div>`;
    }
  }

  // Latest 3 updates
  const updEl = document.getElementById('latest-updates');
  if (updEl) {
    const updates = await loadJSON(UPD_JSON);
    updEl.innerHTML='';
    updates.slice(0,3).forEach(u=>updEl.appendChild(updateCard(u)));
    if (!updates.length) updEl.innerHTML=`<div class="empty-state">${ICO.news()}<h3>No updates yet</h3><p>Add entries in content/updates/index.json</p></div>`;
  }
}

/* ─── VIDEOS ───────────────────────────────────────────────── */
async function initVideos() {
  const grid   = document.getElementById('videos-grid');
  const search = document.getElementById('video-search');
  if (!grid) return;

  const raw = await loadJSON(VIDEOS_JSON);
  grid.innerHTML='';

  if (!raw.length) {
    grid.innerHTML=`<div class="empty-state">${ICO.img()}
      <h3>No videos yet</h3>
      <p>Go to your GitHub repo → <strong>Actions</strong> tab → "Update YouTube Videos" → click <strong>Run workflow</strong>.</p></div>`;
    return;
  }

  const videos = raw.map(v=>({...v, category: v.category||guessCategory(v.title,v.description)}));
  videos.forEach(v=>grid.appendChild(videoCard(v)));
  setupFilters(grid, search);
}

/* ─── RESOURCES ────────────────────────────────────────────── */
async function initResources() {
  const grid   = document.getElementById('resources-grid');
  const search = document.getElementById('resource-search');
  if (!grid) return;

  const list = await loadJSON(RES_JSON);
  grid.innerHTML='';

  if (!list.length) {
    grid.innerHTML=`<div class="empty-state">${ICO.img()}<h3>No resources yet</h3><p>Add entries in content/resources/index.json</p></div>`;
    return;
  }

  list.forEach(r=>grid.appendChild(resourceCard(r)));
  setupFilters(grid, search);

  // Handle ?category= from nav link
  const cat = new URLSearchParams(window.location.search).get('category');
  if (cat) {
    const btn = document.querySelector(`.filter-btn[data-filter="${esc(cat)}"]`);
    if (btn) btn.click();
  }
}

/* ─── UPDATES ──────────────────────────────────────────────── */
async function initUpdates() {
  // Featured latest YT video
  const featEl = document.getElementById('updates-featured-video');
  if (featEl) {
    const videos = await loadJSON(VIDEOS_JSON);
    if (videos.length) {
      const v = videos[0];
      featEl.innerHTML = featuredHTML(v, '🆕 Latest Video');
      featEl.querySelector('.featured-thumb').addEventListener('click', ()=>openVideoModal(v));
    } else {
      featEl.innerHTML='';
    }
  }

  // Paginated updates
  const listEl  = document.getElementById('updates-list');
  const paginEl = document.getElementById('updates-pagination');
  if (!listEl) return;

  const all = await loadJSON(UPD_JSON);
  if (!all.length) {
    listEl.innerHTML=`<div class="empty-state">${ICO.news()}<h3>No updates yet</h3><p>Add entries in content/updates/index.json</p></div>`;
    return;
  }

  const totalPages = Math.ceil(all.length/PER_PAGE);
  let page = 1;

  function render(p) {
    page = p;
    listEl.innerHTML='';
    all.slice((p-1)*PER_PAGE, p*PER_PAGE).forEach(u=>listEl.appendChild(updateCard(u)));

    if (!paginEl) return;
    paginEl.innerHTML='';
    if (totalPages<=1) return;

    const prev = Object.assign(document.createElement('button'),{className:'page-btn',textContent:'← Prev'});
    prev.disabled = p===1;
    prev.addEventListener('click',()=>render(p-1));
    paginEl.appendChild(prev);

    for (let i=1;i<=totalPages;i++) {
      const b = Object.assign(document.createElement('button'),
        {className:'page-btn'+(i===p?' active':''), textContent:String(i)});
      b.addEventListener('click',()=>render(i));
      paginEl.appendChild(b);
    }

    const next = Object.assign(document.createElement('button'),{className:'page-btn',textContent:'Next →'});
    next.disabled = p===totalPages;
    next.addEventListener('click',()=>render(p+1));
    paginEl.appendChild(next);
  }

  render(1);
}

/* ─── ABOUT ─────────────────────────────────────────────────── */
function initAbout() {
  const img = document.querySelector('.about-avatar');
  if (!img) return;
  img.addEventListener('error', () => {
    const ph = document.createElement('div');
    ph.className='about-avatar-placeholder';
    ph.innerHTML=`<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span style="font-size:.85rem;color:var(--text-muted)">Photo coming soon</span>`;
    img.replaceWith(ph);
  });
}

/* ─── ROUTER ───────────────────────────────────────────────── */
function routePage() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  if (page===''||page==='index.html')   return initHome();
  if (page==='videos.html')             return initVideos();
  if (page==='resources.html')          return initResources();
  if (page==='updates.html')            return initUpdates();
  if (page==='about.html')              return initAbout();
}

/* ─── BOOT ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHamburger();
  updateFooterYear();
  routePage();
});
