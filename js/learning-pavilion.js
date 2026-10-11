/**
 * Learning Pavilion: filter and search the downloadable checklists.
 * Buttons use data-filter="all|service|industry"; cards carry data-type and
 * data-title. Filter and search use are reported to GA4 via window.mtgTrack.
 */
(function () {
    'use strict';

    function init() {
        var grid = document.getElementById('resourceGrid');
        if (!grid) return;
        var cards = Array.prototype.slice.call(grid.querySelectorAll('.resource-card'));
        var buttons = Array.prototype.slice.call(document.querySelectorAll('.content-filter[data-filter]'));
        var search = document.getElementById('resourceSearch');
        var status = document.getElementById('resourceStatus');
        var empty = document.getElementById('resourceEmpty');
        var type = 'all';
        var term = '';
        var searchTimer = null;

        function track(name, params) { if (window.mtgTrack) window.mtgTrack(name, params); }

        function apply() {
            var shown = 0;
            cards.forEach(function (card) {
                var okType = type === 'all' || card.getAttribute('data-type') === type;
                var okTerm = !term || card.getAttribute('data-title').indexOf(term) !== -1;
                var visible = okType && okTerm;
                card.hidden = !visible;
                if (visible) shown++;
            });
            status.textContent = 'Showing ' + shown + ' of ' + cards.length + ' checklists';
            empty.hidden = shown !== 0;
        }

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                type = btn.getAttribute('data-filter');
                buttons.forEach(function (b) {
                    var on = b === btn;
                    b.classList.toggle('is-active', on);
                    b.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
                apply();
                track('lp_filter', { filter_group: 'type', filter_value: type });
            });
        });

        search.addEventListener('input', function () {
            term = search.value.trim().toLowerCase();
            apply();
            clearTimeout(searchTimer);
            if (term.length > 2) {
                searchTimer = setTimeout(function () { track('lp_search', { search_term: term }); }, 900);
            }
        });

        apply();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
