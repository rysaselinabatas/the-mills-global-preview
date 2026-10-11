/**
 * Smooth (inertial) scrolling for every page, using Lenis (js/vendor/lenis.min.js).
 * Pauses while the loader or a popup is open, lets anchors glide, and is skipped
 * for visitors who prefer reduced motion.
 */
(function () {
    'use strict';
    if (!window.Lenis) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var lenis = new window.Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.4
    });
    window.millsLenis = lenis;

    function raf(time) {
        lenis.raf(time);
        window.requestAnimationFrame(raf);
    }
    window.requestAnimationFrame(raf);

    // Stop scrolling while the loading screen or a popup is showing
    var root = document.documentElement;
    function sync() {
        var locked = root.classList.contains('mills-loading') || root.classList.contains('lm-lock');
        if (locked) lenis.stop(); else lenis.start();
    }
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
    sync();

    // In-page anchors (Book a Consultation, nav links) glide too
    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70, duration: 1.4 });
        if (window.history && window.history.pushState) window.history.pushState(null, '', id);
    });
})();
