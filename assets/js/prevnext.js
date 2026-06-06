/* Prev/next navigation between articles in the same category.
   Self-contained: finds the current page among the category JSON feeds (by URL path),
   orders that category by publish date, and injects a prev/next bar before the footer.
   Drop <script src="/assets/js/prevnext.js"></script> on any article page. */
(function () {
  'use strict';

  var SOURCES = [
    '/data/writing.json',
    '/data/breakdowns.json',
    '/data/body-mind.json',
    '/data/faith-family.json'
  ];

  var path = location.pathname;

  function getJSON(file) {
    return fetch(file).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }

  Promise.all(SOURCES.map(getJSON)).then(function (groups) {
    // Find the category list that contains the current page
    var list = null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].some(function (c) { return c.url === path; })) { list = groups[i]; break; }
    }
    if (!list) return; // not an article in a known category (e.g. tracker, PDFs)

    // Only HTML article entries, ordered newest-first by publish date
    var items = list.filter(function (c) { return (c.url || '').slice(-5) === '.html'; })
      .sort(function (a, b) {
        return (b.published || b.date_sort || '').localeCompare(a.published || a.date_sort || '');
      });

    var idx = items.findIndex(function (c) { return c.url === path; });
    if (idx === -1 || items.length < 2) return;

    var newer = items[idx - 1]; // published more recently
    var older = items[idx + 1]; // published earlier

    // styles (scoped, theme-variable driven)
    var css =
      '.prevnext{max-width:660px;margin:0 auto;padding:0 3rem 3rem;display:flex;gap:1rem;font-family:"DM Sans",sans-serif}' +
      '.prevnext a{flex:1;text-decoration:none;border:1px solid var(--border,rgba(255,255,255,0.06));padding:0.9rem 1.1rem;transition:border-color 0.3s,background 0.3s;min-width:0}' +
      '.prevnext a:hover{border-color:var(--border-hover,rgba(255,255,255,0.12));background:rgba(255,255,255,0.03)}' +
      '.prevnext .pn-dir{font-size:0.66rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted,#5a5750);margin-bottom:0.3rem}' +
      '.prevnext .pn-title{font-family:"Libre Baskerville",serif;font-size:0.9rem;color:var(--text-heading,#e8e5de);line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.prevnext a.pn-next{text-align:right}' +
      '@media(max-width:768px){.prevnext{padding:0 1.5rem 2.5rem;flex-direction:column}}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    function card(item, dir, cls) {
      return '<a class="' + cls + '" href="' + item.url + '">' +
        '<div class="pn-dir">' + dir + '</div>' +
        '<div class="pn-title">' + (item.title || '').replace(/</g, '&lt;') + '</div></a>';
    }

    var html = '';
    html += older ? card(older, '← Older', 'pn-prev') : '<span style="flex:1"></span>';
    html += newer ? card(newer, 'Newer →', 'pn-next') : '<span style="flex:1"></span>';

    var bar = document.createElement('nav');
    bar.className = 'prevnext';
    bar.setAttribute('aria-label', 'More in this section');
    bar.innerHTML = html;

    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(bar, footer);
    } else {
      document.body.appendChild(bar);
    }
  });
})();
