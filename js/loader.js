/**
 * Site loading screen. Plays the Mills mograph (silent) on a navy gradient and
 * leaves as soon as the page and its assets have finished loading. Shown once
 * per browser session so moving between pages stays fast. Loaded in <head>.
 */
(function () {
    'use strict';
    try {
        if (window.sessionStorage.getItem('millsLoaderSeen')) return;
        window.sessionStorage.setItem('millsLoaderSeen', '1');
    } catch (e) { /* storage blocked: show the loader anyway */ }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var css = '' +
        '#millsLoader{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
        'background:linear-gradient(90deg,#3B475C 0%,#2A2F41 30%,#212431 58%,#212431 100%);transition:opacity .5s ease,visibility .5s ease}' +
        '#millsLoader.is-leaving{opacity:0;visibility:hidden}' +
        '#millsLoader video{display:block;width:clamp(300px,32vw,460px);height:auto;mix-blend-mode:screen;pointer-events:none}' +
        'html.mills-loading{overflow:hidden}';
    var style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);

    var el = document.createElement('div');
    el.id = 'millsLoader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-label', 'Loading');
    el.innerHTML = '<video muted playsinline autoplay preload="auto" aria-hidden="true">' +
        '<source src="assets/videos/loader-mograph.webm" type="video/webm">' +
        '<source src="assets/videos/loader-mograph.mp4" type="video/mp4"></video>';
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
    if (document.readyState === 'complete') leave();
    else window.addEventListener('load', leave);
    setTimeout(leave, 12000); // safety net so a slow asset never traps the visitor
})();
