/**
 * Analytics helper for The Mills Global (GA4).
 *
 * window.mtgTrack(name, params) sends a GA4 event through gtag when it exists,
 * and always mirrors it to window.dataLayer so Google Tag Manager can use it too.
 *
 * SETUP: set GA_MEASUREMENT_ID to the site's GA4 ID (looks like G-XXXXXXXXXX).
 * gtag.js is only loaded on themillsglobal.com, so the GitHub preview never
 * pollutes the real property. If the page already has gtag or GTM installed,
 * this file reuses it and does not load a second copy.
 * Add ?ga_debug=1 to any URL to log events to the browser console.
 */
(function () {
    'use strict';

    var GA_MEASUREMENT_ID = '';

    var host = window.location.hostname;
    var isProduction = /(^|\.)themillsglobal\.com$/.test(host);
    var debug = /[?&]ga_debug=1\b/.test(window.location.search) || !isProduction;

    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
        window.gtag = function () { window.dataLayer.push(arguments); };
        if (GA_MEASUREMENT_ID && isProduction) {
            var s = document.createElement('script');
            s.async = true;
            s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
            document.head.appendChild(s);
            window.gtag('js', new Date());
            window.gtag('config', GA_MEASUREMENT_ID);
        }
    }

    window.mtgTrack = function (name, params) {
        params = params || {};
        params.page_path = window.location.pathname;
        if (debug) console.debug('[ga4 event]', name, params);
        try {
            window.gtag('event', name, params);
            window.dataLayer.push(Object.assign({ event: name }, params));
        } catch (e) { /* never let tracking break the page */ }
    };

    document.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target.closest('a, button, [data-ga]') : null;
        if (!el) return;

        // Explicit tags: data-ga="event_name" data-ga-label="where on the page"
        var tag = el.closest('[data-ga]');
        if (tag) {
            window.mtgTrack(tag.getAttribute('data-ga'), {
                label: tag.getAttribute('data-ga-label') || (tag.textContent || '').trim().slice(0, 60)
            });
        }

        // Automatic: calls, emails and Book a Call links
        var href = el.getAttribute && el.getAttribute('href');
        if (!href) return;
        if (href.indexOf('mailto:') === 0) window.mtgTrack('contact_click', { method: 'email' });
        else if (href.indexOf('tel:') === 0) window.mtgTrack('contact_click', { method: 'phone' });
        else if (href.indexOf('book-a-call') !== -1) window.mtgTrack('book_call_click', { link_text: (el.textContent || '').trim().slice(0, 60) });
    });
})();
