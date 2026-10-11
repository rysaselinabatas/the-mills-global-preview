/**
 * Cal.com booking calendar for the "Book a Call" section on every funnel page.
 * Fills #book-call-embed with the inline embed for the-mills-global-ph-meeting/30min.
 * Cal's script is only fetched when the section is close to the viewport, so
 * pages that never scroll that far pay nothing for it.
 */
(function () {
    'use strict';

    var host = document.getElementById('book-call-embed');
    if (!host) return;

    var CAL_LINK = 'the-mills-global-ph-meeting/30min';
    var NS = '30min';
    var started = false;

    function start() {
        if (started) return;
        started = true;

        host.innerHTML = '<div id="my-cal-inline-30min" style="width:100%;min-height:640px;overflow:auto"></div>';

        (function (C, A, L) {
            var p = function (a, ar) { a.q.push(ar); };
            var d = C.document;
            C.Cal = C.Cal || function () {
                var cal = C.Cal;
                var ar = arguments;
                if (!cal.loaded) {
                    cal.ns = {};
                    cal.q = cal.q || [];
                    d.head.appendChild(d.createElement('script')).src = A;
                    cal.loaded = true;
                }
                if (ar[0] === L) {
                    var api = function () { p(api, arguments); };
                    var namespace = ar[1];
                    api.q = api.q || [];
                    if (typeof namespace === 'string') {
                        cal.ns[namespace] = cal.ns[namespace] || api;
                        p(cal.ns[namespace], ar);
                        p(cal, ['initNamespace', namespace]);
                    } else p(cal, ar);
                    return;
                }
                p(cal, ar);
            };
        })(window, 'https://app.cal.com/embed/embed.js', 'init');

        window.Cal('init', NS, { origin: 'https://app.cal.com' });
        window.Cal.config = window.Cal.config || {};
        window.Cal.config.forwardQueryParams = true;

        window.Cal.ns[NS]('inline', {
            elementOrSelector: '#my-cal-inline-30min',
            config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'light' },
            calLink: CAL_LINK
        });

        window.Cal.ns[NS]('ui', {
            theme: 'light',
            cssVarsPerTheme: { light: { 'cal-brand': '#EA5C1F' }, dark: { 'cal-brand': '#acbfe1' } },
            hideEventTypeDetails: false,
            layout: 'month_view'
        });

        // Report completed bookings to GA4 when analytics.js is present
        window.Cal.ns[NS]('on', {
            action: 'bookingSuccessful',
            callback: function () {
                if (window.mtgTrack) window.mtgTrack('book_call_scheduled', { calendar: CAL_LINK });
            }
        });
    }

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            if (entries.some(function (e) { return e.isIntersecting; })) {
                io.disconnect();
                start();
            }
        }, { rootMargin: '600px 0px' });
        io.observe(host);
    } else {
        start();
    }
})();
