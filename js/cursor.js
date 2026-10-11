/**
 * Custom cursor: an orange ring that glides after the pointer with a soft,
 * sleek lag, plus a small dot that tracks it exactly. The ring grows over
 * links and buttons. Desktop (fine pointer) only.
 */
(function () {
    'use strict';
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var root = document.documentElement;
    var ring = document.createElement('div');
    var dot = document.createElement('div');
    ring.className = 'mills-cursor';
    dot.className = 'mills-cursor-dot';
    ring.setAttribute('aria-hidden', 'true');
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    root.classList.add('has-custom-cursor');

    var mouse = { x: -100, y: -100 };
    var pos = { x: -100, y: -100 };
        var scale = 1, scaleTarget = 1;
    var seen = false;

    var FOLLOW = 0.16;      // glide toward the pointer: no overshoot, no bounce

    var INTERACTIVE = 'a, button, [data-open], [role="button"], summary, label, .content-card, .faq-question, .service-slide, .cta-pair *';
    var TEXTY = 'input, textarea, select';

    document.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        if (!seen) {
            seen = true;
            pos.x = mouse.x;
            pos.y = mouse.y;
            root.classList.add('cursor-visible');
        }
        var t = e.target;
        var texty = t.closest && t.closest(TEXTY);
        root.classList.toggle('cursor-texty', !!texty);
        var hot = t.closest && t.closest(INTERACTIVE);
        scaleTarget = hot ? 1.9 : 1;
        ring.classList.toggle('is-hot', !!hot);
    }, { passive: true });

    document.addEventListener('mousedown', function () { ring.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { ring.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { root.classList.remove('cursor-visible'); seen = false; });
    document.addEventListener('mouseenter', function () { root.classList.add('cursor-visible'); });

    function tick() {
        pos.x += (mouse.x - pos.x) * FOLLOW;
        pos.y += (mouse.y - pos.y) * FOLLOW;
        scale += (scaleTarget - scale) * 0.14;

        ring.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0) translate(-50%,-50%) scale(' + scale + ')';
        dot.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0) translate(-50%,-50%)';
        window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
})();
