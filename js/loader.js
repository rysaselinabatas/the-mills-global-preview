/**
 * Site loading screen: silent Mills mograph on a navy gradient.
 *  - First page of a browser session: the full mograph, on screen at least 4 s.
 *  - Every page after that: the fast (3x) mograph, on screen at least 1 s.
 * It leaves once the page and its assets have loaded AND the minimum time has
 * passed. Add ?loader=1 to any URL to preview the full version again.
 * Loaded in <head>.
 */
(function () {
    'use strict';
    var force = /[?&]loader=1\b/.test(window.location.search);
    var seen = false;
    try {
        seen = !!window.sessionStorage.getItem('millsLoaderSeen');
        window.sessionStorage.setItem('millsLoaderSeen', '1');
    } catch (e) { /* storage blocked: treat as a first visit */ }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var fast = seen && !force;
    var MIN_MS = fast ? 1000 : 4000;
    var clip = fast ? 'loader-fast' : 'loader-mograph-v2';
    var shownAt = Date.now();

    var css = '' +
        '#millsLoader{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
        'background:linear-gradient(90deg,#4A6BA3 0%,#2F3B5C 30%,#212431 58%,#212431 100%);transition:opacity .5s ease,visibility .5s ease}' +
        '#millsLoader.is-leaving{opacity:0;visibility:hidden}' +
        '#millsLoader video{display:block;width:clamp(220px,24vw,320px);height:auto;mix-blend-mode:screen;pointer-events:none}' +
        'html.mills-loading{overflow:hidden}';
    var style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);

    var el = document.createElement('div');
    el.id = 'millsLoader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-label', 'Loading');
    el.innerHTML = '<video muted playsinline autoplay preload="auto" aria-hidden="true">' +
        '<source src="assets/videos/' + clip + '.webm" type="video/webm">' +
        '<source src="assets/videos/' + clip + '.mp4" type="video/mp4"></video>';
    document.documentElement.appendChild(el);
    document.documentElement.classList.add('mills-loading');
    var video = el.querySelector('video');
    video.muted = true;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: gradient only */ });

    var done = false;
    function leave() {
        if (done) return;
        done = true;
        el.classList.add('is-leaving');
        document.documentElement.classList.remove('mills-loading');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
    }
    function leaveWhenReady() {
        var wait = MIN_MS - (Date.now() - shownAt);
        if (wait > 0) setTimeout(leave, wait);
        else leave();
    }
    if (document.readyState === 'complete') leaveWhenReady();
    else window.addEventListener('load', leaveWhenReady);
    setTimeout(leave, 12000); // safety net so a slow asset never traps the visitor
})();
