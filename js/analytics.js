/**
 * Tracking for The Mills Global.
 *
 * Third-party tags (Google Tag Manager, Google Ads, LinkedIn Insight,
 * ContentSquare) load ONLY on themillsglobal.com, so the GitHub and Vercel
 * preview addresses never send data to the real accounts.
 *
 * window.mtgTrack(name, params) pushes a custom event to the dataLayer.
 * Google Tag Manager picks these up with Custom Event triggers and forwards
 * them to GA4. Add ?ga_debug=1 to any URL to log events in the console.
 *
 * Also captures ad attribution (gclid, utm_*) for the lead magnet form.
 */
(function () {
    'use strict';

    var GTM_ID = 'GTM-K3QFNL94';
    var ADS_ID = 'AW-17000148570';
    var ADS_PHONE_CONVERSION = 'AW-17000148570/1VnWCI_inOEcENrcpqo_';
    var LINKEDIN_PARTNER_ID = '9889316';
    var LINKEDIN_BOOKING_CONVERSION = 28098724;
    var CONTENTSQUARE_SRC = 'https://t.contentsquare.net/uxa/fde570633e6be.js';

    var host = window.location.hostname;
    var isProduction = /(^|\.)themillsglobal\.com$/.test(host);
    var debug = /[?&]ga_debug=1\b/.test(window.location.search) || !isProduction;

    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
        window.gtag = function () { window.dataLayer.push(arguments); };
    }

    function loadScript(src) {
        var s = document.createElement('script');
        s.async = true;
        s.src = src;
        document.head.appendChild(s);
    }

    if (isProduction) {
        // Google Tag Manager
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        loadScript('https://www.googletagmanager.com/gtm.js?id=' + GTM_ID);

        // Google Ads (conversion on phone clicks)
        loadScript('https://www.googletagmanager.com/gtag/js?id=' + ADS_ID);
        window.gtag('js', new Date());
        window.gtag('config', ADS_ID);

        // LinkedIn Insight Tag
        window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
        window._linkedin_data_partner_ids.push(LINKEDIN_PARTNER_ID);
        if (!window.lintrk) {
            window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); };
            window.lintrk.q = [];
        }
        loadScript('https://snap.licdn.com/li.lms-analytics/insight.min.js');

        // ContentSquare
        loadScript(CONTENTSQUARE_SRC);
    }

    window.mtgTrack = function (name, params) {
        params = params || {};
        params.page_path = window.location.pathname;
        if (debug) console.debug('[event]', name, params);
        try {
            window.dataLayer.push(Object.assign({ event: name }, params));
        } catch (e) { /* never let tracking break the page */ }
    };

    // Ad attribution: remember gclid and utm_* from the landing URL for this visit
    var ATTR_KEYS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var ATTR_STORE = 'mtgAttribution';
    try {
        var found = {};
        var q = new URLSearchParams(window.location.search);
        ATTR_KEYS.forEach(function (k) { if (q.get(k)) found[k] = q.get(k); });
        if (Object.keys(found).length) window.sessionStorage.setItem(ATTR_STORE, JSON.stringify(found));
    } catch (e) { /* storage blocked */ }
    window.mtgAttribution = function () {
        try { return JSON.parse(window.sessionStorage.getItem(ATTR_STORE) || '{}'); } catch (e) { return {}; }
    };

    function linkedinBookingConversion() {
        if (isProduction && window.lintrk) window.lintrk('track', { conversion_id: LINKEDIN_BOOKING_CONVERSION });
    }
    window.mtgLinkedinBooking = linkedinBookingConversion;

    document.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target.closest('a, button, [data-ga]') : null;
        if (!el) return;

        // Explicit tags: data-ga="event_name" data-ga-label="where on the page"
        var tag = el.closest('[data-ga]');
        if (tag) {
            var name = tag.getAttribute('data-ga');
            window.mtgTrack(name, {
                label: tag.getAttribute('data-ga-label') || (tag.textContent || '').trim().slice(0, 60)
            });
            if (name === 'hero_book_consultation' || name === 'cta_book_consultation') linkedinBookingConversion();
        }

        var href = el.getAttribute && el.getAttribute('href');
        if (!href) return;
        if (href.indexOf('mailto:') === 0) {
            window.mtgTrack('contact_click', { method: 'email' });
        } else if (href.indexOf('tel:') === 0) {
            window.mtgTrack('contact_click', { method: 'phone' });
            // Google Ads phone-call conversion. Never blocks the call.
            if (isProduction) {
                window.gtag('event', 'conversion', { send_to: ADS_PHONE_CONVERSION, value: 1.0, currency: 'PHP' });
            }
        } else if (href.indexOf('book-a-call') !== -1) {
            window.mtgTrack('book_call_click', { link_text: (el.textContent || '').trim().slice(0, 60) });
            linkedinBookingConversion();
        }
    });
})();
