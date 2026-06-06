/* Global site search. Self-contained: injects styles, a nav trigger, and an overlay.
   Requires content.js (SiteContent) to be loaded first. */
(function () {
  'use strict';

  if (!window.SiteContent) {
    console.error('search.js requires content.js (SiteContent) to load first.');
    return;
  }

  var TYPE_LABEL = { article: '', book: 'Library', game: 'Games' };
  function typeLabel(it) {
    return it.type === 'article' ? it.category : (TYPE_LABEL[it.type] || it.type);
  }
  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- styles ----
  var css = '' +
  '.site-search-trigger{background:none;border:none;cursor:pointer;color:var(--text-heading,#e8e5de);padding:0;display:inline-flex;align-items:center;opacity:0.85;transition:opacity 0.3s;font-family:inherit}' +
  '.site-search-trigger:hover{opacity:1}' +
  '.site-search-trigger svg{display:block;width:17px;height:17px}' +
  '.search-overlay{position:fixed;inset:0;z-index:1000;display:none;background:rgba(10,12,14,0.72);backdrop-filter:blur(4px)}' +
  '.search-overlay.open{display:block}' +
  '.search-panel{max-width:640px;margin:8vh auto 0;background:var(--bg-card,#212428);border:1px solid var(--border-hover,rgba(255,255,255,0.12));box-shadow:0 24px 60px rgba(0,0,0,0.5);max-height:80vh;display:flex;flex-direction:column}' +
  '.search-input-row{display:flex;align-items:center;gap:0.75rem;padding:1.1rem 1.25rem;border-bottom:1px solid var(--border,rgba(255,255,255,0.06))}' +
  '.search-input-row svg{width:18px;height:18px;color:var(--text-muted,#5a5750);flex-shrink:0}' +
  '.search-input{flex:1;background:none;border:none;outline:none;color:var(--text-heading,#e8e5de);font-family:inherit;font-size:1.05rem}' +
  '.search-input::placeholder{color:var(--text-muted,#5a5750)}' +
  '.search-close{background:none;border:1px solid var(--border,rgba(255,255,255,0.06));color:var(--text-muted,#5a5750);font-family:inherit;font-size:0.7rem;letter-spacing:0.06em;padding:0.2rem 0.5rem;cursor:pointer;transition:color 0.2s,border-color 0.2s}' +
  '.search-close:hover{color:var(--text-heading,#e8e5de);border-color:var(--border-hover,rgba(255,255,255,0.12))}' +
  '.search-results{overflow-y:auto;padding:0.5rem 0}' +
  '.search-hint,.search-empty{padding:1.5rem 1.25rem;color:var(--text-muted,#5a5750);font-size:0.85rem;font-family:inherit}' +
  '.search-item{display:flex;align-items:baseline;gap:0.85rem;padding:0.7rem 1.25rem;text-decoration:none;color:inherit;transition:background 0.2s}' +
  '.search-item:hover{background:rgba(255,255,255,0.04)}' +
  '.search-type{font-size:0.58rem;letter-spacing:0.07em;text-transform:uppercase;color:var(--text-muted,#5a5750);border:1px solid var(--border,rgba(255,255,255,0.06));padding:0.12rem 0.45rem;flex-shrink:0;min-width:5rem;text-align:center;white-space:nowrap}' +
  '.search-title{font-family:"Libre Baskerville",serif;font-size:0.95rem;color:var(--text-heading,#e8e5de);flex:1;line-height:1.35}' +
  '.search-blurb{font-size:0.72rem;color:var(--text-muted,#5a5750);flex-shrink:0;max-width:35%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '.search-count{padding:0.5rem 1.25rem;color:var(--text-muted,#5a5750);font-size:0.72rem;letter-spacing:0.04em;border-bottom:1px solid var(--border,rgba(255,255,255,0.06))}' +
  '@media(max-width:768px){.search-panel{margin:4vh 1rem 0}.search-blurb{display:none}.search-type{min-width:4rem}}';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';

  // ---- overlay markup ----
  var overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.innerHTML =
    '<div class="search-panel" role="dialog" aria-label="Search">' +
      '<div class="search-input-row">' + SEARCH_SVG +
        '<input type="text" class="search-input" placeholder="Search books, games, writing…" aria-label="Search the site">' +
        '<button class="search-close" type="button">Esc</button>' +
      '</div>' +
      '<div class="search-results" id="search-results"><div class="search-hint">Type to search across everything on the site.</div></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = overlay.querySelector('.search-input');
  var resultsEl = overlay.querySelector('#search-results');
  var panel = overlay.querySelector('.search-panel');
  var allItems = null;

  function openSearch() {
    overlay.classList.add('open');
    input.value = '';
    renderResults('');
    setTimeout(function () { input.focus(); }, 30);
    if (allItems === null) {
      SiteContent.loadAllContent().then(function (items) { allItems = items; }).catch(function () { allItems = []; });
    }
  }
  function closeSearch() { overlay.classList.remove('open'); }

  function renderResults(q) {
    if (!q) {
      resultsEl.innerHTML = '<div class="search-hint">Type to search across everything on the site.</div>';
      return;
    }
    if (allItems === null) {
      resultsEl.innerHTML = '<div class="search-hint">Loading…</div>';
      return;
    }
    var hits = SiteContent.search(allItems, q);
    if (!hits.length) {
      resultsEl.innerHTML = '<div class="search-empty">No matches for &ldquo;' + esc(q) + '&rdquo;.</div>';
      return;
    }
    // newest-first, cap to keep the list snappy
    var sorted = SiteContent.latest(hits).slice(0, 40);
    var html = '<div class="search-count">' + hits.length + ' result' + (hits.length !== 1 ? 's' : '') +
      (hits.length > 40 ? ' (showing 40)' : '') + '</div>';
    sorted.forEach(function (it) {
      html += '<a class="search-item" href="' + esc(it.url) + '"' + (it.external ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<span class="search-type">' + esc(typeLabel(it)) + '</span>' +
        '<span class="search-title">' + esc(it.title) + '</span>' +
        '<span class="search-blurb">' + esc(it.blurb || '') + '</span>' +
      '</a>';
    });
    resultsEl.innerHTML = html;
  }

  input.addEventListener('input', function () { renderResults(input.value.trim()); });
  overlay.querySelector('.search-close').addEventListener('click', closeSearch);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch(); });

  // ---- inject the trigger into the nav ----
  function injectTrigger() {
    var btn = document.createElement('button');
    btn.className = 'site-search-trigger';
    btn.setAttribute('aria-label', 'Search');
    btn.type = 'button';
    btn.innerHTML = SEARCH_SVG;
    btn.addEventListener('click', openSearch);

    var navLinks = document.querySelector('.nav-links');
    if (navLinks) { navLinks.appendChild(btn); return; }
    // article-style nav: append to the <nav> element directly
    var nav = document.querySelector('nav');
    if (nav) { nav.appendChild(btn); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTrigger);
  } else {
    injectTrigger();
  }
})();
