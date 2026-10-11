/**
 * Custom cursor: a small dot that tracks the pointer exactly, plus a larger
 * outlined ring that trails it with soft momentum and stretches slightly in the
 * direction of travel. Both invert what is beneath them. The ring grows over
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
    var vel = { x: 0, y: 0 };
    var scale = 1, scaleTarget = 1;
    var seen = false;

    var STIFFNESS = 0.12;   // pull toward the pointer
    var DAMPING = 0.82;     // near critical damping: a soft lag with barely any overshoot

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
        vel.x = (vel.x + (mouse.x - pos.x) * STIFFNESS) * DAMPING;
        vel.y = (vel.y + (mouse.y - pos.y) * STIFFNESS) * DAMPING;
        pos.x += vel.x;
        pos.y += vel.y;
        scale += (scaleTarget - scale) * 0.14;

        // stretch gently along the direction of travel, then settle back to a circle
        var speed = Math.min(Math.hypot(vel.x, vel.y), 30);
        var stretch = 1 + speed / 150;
        var angle = Math.atan2(vel.y, vel.x) * 180 / Math.PI;

        ring.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0) translate(-50%,-50%) rotate(' + angle + 'deg) scale(' + (scale * stretch) + ',' + (scale / stretch) + ')';
        dot.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0) translate(-50%,-50%)';
        window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
})();
