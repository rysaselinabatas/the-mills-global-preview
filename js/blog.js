/**
 * Blog listing: filter by type and category, search, and load more.
 * Data comes from content/posts.json (built by tools/build-content.py).
 * The first 12 posts are already in the HTML for search engines and no-JS visitors.
 */
(function () {
    'use strict';

    var grid = document.getElementById('postGrid');
    if (!grid) return;
    var catsEl = document.getElementById('postCats');
    var statusEl = document.getElementById('postStatus');
    var emptyEl = document.getElementById('postEmpty');
    var moreBtn = document.getElementById('postMore');
    var search = document.getElementById('postSearch');
    var typeBtns = Array.prototype.slice.call(document.querySelectorAll('.blog-tools [data-type]'));
    var PAGE = 12;
    var posts = [];
    var state = { type: 'all', cat: 'all', q: '', shown: PAGE };
    var timer = null;

    function track(name, params) { if (window.mtgTrack) window.mtgTrack(name, params); }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    function cardHtml(p) {
        return '<a href="' + p.url + '" class="content-card">' +
            '<div class="content-card__image"><img src="' + p.img + '" alt="' + esc(p.title) + '" loading="lazy"></div>' +
            '<div class="content-card__body">' +
            (p.t === 'news' ? '<span class="content-card__badge">News</span>' : '') +
            '<p class="content-card__tag">' + esc(p.cat) + '</p>' +
            '<h3 class="content-card__title">' + esc(p.title) + '</h3>' +
            '<p class="content-card__excerpt">' + esc(p.summary) + '</p>' +
            '<p class="content-card__meta">' + p.dateLabel + ' &middot; ' + p.mins + ' min read</p>' +
            '</div></a>';
    }

    function matching(ignoreCat) {
        var q = state.q.toLowerCase();
        return posts.filter(function (p) {
            if (state.type !== 'all' && p.t !== state.type) return false;
            if (!ignoreCat && state.cat !== 'all' && p.catSlug !== state.cat) return false;
            if (q && (p.title + ' ' + p.summary + ' ' + p.cat).toLowerCase().indexOf(q) === -1) return false;
            return true;
        });
    }

    function renderCats() {
        var counts = {}, labels = {};
        matching(true).forEach(function (p) { counts[p.catSlug] = (counts[p.catSlug] || 0) + 1; labels[p.catSlug] = p.cat; });
        var slugs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
        if (state.cat !== 'all' && !counts[state.cat]) state.cat = 'all';
        var total = matching(true).length;
        var html = '<button type="button" class="content-filter' + (state.cat === 'all' ? ' is-active' : '') + '" data-cat="all">All topics <span class="content-filter__count">' + total + '</span></button>';
        slugs.forEach(function (s) {
            html += '<button type="button" class="content-filter' + (state.cat === s ? ' is-active' : '') + '" data-cat="' + s + '">' + esc(labels[s]) + ' <span class="content-filter__count">' + counts[s] + '</span></button>';
        });
        catsEl.innerHTML = html;
    }

    function render() {
        renderCats();
        var list = matching(false);
        grid.innerHTML = list.slice(0, state.shown).map(cardHtml).join('');
        emptyEl.hidden = list.length !== 0;
        moreBtn.hidden = list.length <= state.shown;
        statusEl.textContent = list.length ? 'Showing ' + Math.min(state.shown, list.length) + ' of ' + list.length : '';
        typeBtns.forEach(function (b) {
            var on = b.getAttribute('data-type') === state.type;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function readUrl() {
        var q = new URLSearchParams(window.location.search);
        if (q.get('type') === 'article' || q.get('type') === 'news') state.type = q.get('type');
        if (q.get('category')) state.cat = q.get('category');
        if (q.get('q')) { state.q = q.get('q'); search.value = state.q; }
    }

    typeBtns.forEach(function (b) {
        b.addEventListener('click', function () {
            state.type = b.getAttribute('data-type'); state.cat = 'all'; state.shown = PAGE;
            render();
            track('blog_filter', { filter_group: 'type', filter_value: state.type });
        });
    });
    catsEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cat]');
        if (!b) return;
        state.cat = b.getAttribute('data-cat'); state.shown = PAGE;
        render();
        track('blog_filter', { filter_group: 'category', filter_value: state.cat });
    });
    moreBtn.addEventListener('click', function () { state.shown += PAGE; render(); });
    search.addEventListener('input', function () {
        state.q = search.value.trim(); state.shown = PAGE; render();
        clearTimeout(timer);
        if (state.q.length > 2) timer = setTimeout(function () { track('blog_search', { search_term: state.q.toLowerCase() }); }, 900);
    });

    fetch('content/posts.json').then(function (r) { return r.json(); }).then(function (data) {
        posts = data;
        readUrl();
        render();
    }).catch(function () { /* the first 12 posts stay in the HTML */ });
})();
