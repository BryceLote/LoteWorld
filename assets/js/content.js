/* Shared content layer for Bryce Lote's site.
   loadAllContent() fetches every content JSON and normalizes each item into one shape:
     { id, title, url, type, category, tags[], date_sort, blurb, cover, external }
   Used by the homepage Latest feed, the tag cloud, and global search.
   Root-relative paths assume serving from the domain root. */
(function (global) {
  'use strict';

  var ARTICLE_SOURCES = [
    { file: '/data/writing.json',       category: 'Writing' },
    { file: '/data/breakdowns.json',    category: 'Breakdowns' },
    { file: '/data/body-mind.json',     category: 'Body & Mind' },
    { file: '/data/faith-family.json',  category: 'Faith & Family' }
  ];

  function getJSON(file) {
    return fetch(file).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + file);
      return r.json();
    });
  }

  // Build a date_sort for catalog items that only have a year.
  function yearToSort(year) {
    return year ? (String(year) + '-01-01') : '';
  }

  function normalizeArticle(card, category) {
    return {
      id: (card.url || card.title),
      title: card.title,
      url: card.url || '#',
      type: 'article',
      category: category,
      tags: (card.tags || []).slice(),
      date_sort: card.date_sort || '',
      published: card.published || card.date_sort || '',
      date_label: card.date || '',
      blurb: card.description || '',
      cover: card.image || null,
      external: /^https?:|\.pdf$/i.test(card.url || '')
    };
  }

  function normalizeBook(b) {
    var tags = [];
    if (b.genre) tags.push(b.genre);
    if (b.series && b.series.toLowerCase() !== 'standalone') tags.push(b.series);
    return {
      id: b.id,
      title: b.title,
      url: '/pages/library.html#' + b.id,   // on-site card (auto-expands + scrolls)
      external_url: b.goodreads || null,      // Goodreads, available from the card itself
      type: 'book',
      category: 'Library',
      tags: tags,
      date_sort: yearToSort(b.year),
      published: b.published || yearToSort(b.year),
      date_label: b.year ? String(b.year) : '',
      blurb: (b.author ? b.author + (b.series && b.series !== 'Standalone' ? ' · ' + b.series : '') : '') ,
      cover: b.cover || null,
      external: false,
      rating: b.rating
    };
  }

  function normalizeGame(g) {
    var tags = [];
    if (g.genre) tags.push(g.genre);
    return {
      id: g.id,
      title: g.title,
      url: '/pages/games.html#' + g.id,     // on-site card (auto-expands + scrolls)
      external_url: g.url || null,           // Steam, available from the card itself
      type: 'game',
      category: 'Games',
      tags: tags,
      date_sort: yearToSort(g.year),
      published: g.published || yearToSort(g.year),
      date_label: g.year ? String(g.year) : '',
      blurb: g.meta || '',
      cover: g.cover || null,
      external: false,
      rating: g.rating
    };
  }

  // Returns a Promise resolving to a flat, normalized array of all content.
  function loadAllContent(opts) {
    opts = opts || {};
    var jobs = [];

    ARTICLE_SOURCES.forEach(function (src) {
      jobs.push(
        getJSON(src.file)
          .then(function (cards) { return cards.map(function (c) { return normalizeArticle(c, src.category); }); })
          .catch(function () { return []; })
      );
    });

    jobs.push(
      getJSON('/data/books.json')
        .then(function (books) { return books.map(normalizeBook); })
        .catch(function () { return []; })
    );
    jobs.push(
      getJSON('/data/games.json')
        .then(function (games) { return games.map(normalizeGame); })
        .catch(function () { return []; })
    );

    return Promise.all(jobs).then(function (groups) {
      var all = [];
      groups.forEach(function (g) { all = all.concat(g); });
      return all;
    });
  }

  // Tag index: { tagName: [items...] }, sorted by count desc available via tagList().
  function buildTagIndex(items) {
    var idx = {};
    items.forEach(function (it) {
      (it.tags || []).forEach(function (t) {
        if (!t) return;
        if (!idx[t]) idx[t] = [];
        idx[t].push(it);
      });
    });
    return idx;
  }

  function tagList(items) {
    var idx = buildTagIndex(items);
    return Object.keys(idx)
      .map(function (t) { return { tag: t, count: idx[t].length, items: idx[t] }; })
      .sort(function (a, b) { return b.count - a.count || a.tag.localeCompare(b.tag); });
  }

  // Newest-first by publish date (falls back to date_sort); undated items sink.
  function latest(items, n) {
    function key(it) { return it.published || it.date_sort || ''; }
    var sorted = items.slice().sort(function (a, b) {
      return key(b).localeCompare(key(a));
    });
    return n ? sorted.slice(0, n) : sorted;
  }

  // Simple substring search over title, blurb, tags, category.
  function search(items, q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    return items.filter(function (it) {
      var hay = (it.title + ' ' + it.blurb + ' ' + (it.tags || []).join(' ') + ' ' + it.category).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  global.SiteContent = {
    loadAllContent: loadAllContent,
    buildTagIndex: buildTagIndex,
    tagList: tagList,
    latest: latest,
    search: search
  };
})(window);
