/**
 * Interactive 3D globe (globe.gl) for the About and Location pages.
 * Any element with data-globe becomes a globe. globe.gl loads only when the
 * element nears the viewport, and the animation pauses while it is off screen.
 */
(function () {
    'use strict';

    var CITIES = [
        { n: 'Manila', lat: 14.560139, lng: 121.01934, hq: true },
        { n: 'Washington', lat: 38.900689, lng: -77.040806 }, { n: 'Tokyo', lat: 35.681236, lng: 139.766105 },
        { n: 'Sydney', lat: -33.86882, lng: 151.20929 }, { n: 'Singapore', lat: 1.280095, lng: 103.852837 },
        { n: 'Shanghai', lat: 31.235929, lng: 121.466207 }, { n: 'Riyadh', lat: 24.713552, lng: 46.675297 },
        { n: 'Paris', lat: 48.870636, lng: 2.318327 }, { n: 'New York', lat: 40.712776, lng: -74.013606 },
        { n: 'Manama', lat: 26.23536, lng: 50.57426 }, { n: 'London', lat: 51.515419, lng: -0.082141 },
        { n: 'Kuwait City', lat: 29.375859, lng: 47.983398 }, { n: 'Kuala Lumpur', lat: 3.159141, lng: 101.719149 },
        { n: 'Houston', lat: 29.758938, lng: -95.364947 }, { n: 'Istanbul', lat: 41.043543, lng: 29.042737 },
        { n: 'Guangzhou', lat: 23.120049, lng: 113.318261 }, { n: 'Dubai', lat: 25.204849, lng: 55.270783 },
        { n: 'Doha', lat: 25.317642, lng: 51.524383 }, { n: 'Chicago', lat: 41.885966, lng: -87.638611 },
        { n: 'Chengdu', lat: 30.652971, lng: 104.068054 }, { n: 'Brussels', lat: 50.85034, lng: 4.35171 },
        { n: 'Auckland', lat: -36.843139, lng: 174.765518 }, { n: 'Bangkok', lat: 13.736717, lng: 100.547355 },
        { n: 'Abu Dhabi', lat: 24.458985, lng: 54.321346 }, { n: 'Amsterdam', lat: 52.367573, lng: 4.904139 },
        { n: 'Beijing', lat: 39.916668, lng: 116.466667 }
    ];
    window.MILLS_CITIES = CITIES;

    var hq = CITIES[0];
    var arcs = CITIES.slice(1).map(function (c) {
        return { startLat: hq.lat, startLng: hq.lng, endLat: c.lat, endLng: c.lng };
    });
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var libPromise = null;

    function loadLib() {
        if (window.Globe) return Promise.resolve();
        if (libPromise) return libPromise;
        libPromise = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'js/vendor/globe.gl.min.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        return libPromise;
    }

    function start(el) {
        loadLib().then(function () {
            var g = window.Globe()(el)
                .globeImageUrl('assets/images/globe/earth-day.jpg')
                .bumpImageUrl('assets/images/globe/earth-topology.png')
                .backgroundColor('rgba(0,0,0,0)')
                .atmosphereColor('#8FB8F0')
                .atmosphereAltitude(0.2)
                .width(el.clientWidth)
                .height(el.clientHeight)
                .pointsData(CITIES)
                .pointLat('lat').pointLng('lng')
                .pointColor(function (d) { return d.hq ? '#EA5C1F' : '#F5F5F5'; })
                .pointAltitude(function (d) { return d.hq ? 0.14 : 0.04; })
                .pointRadius(function (d) { return d.hq ? 0.6 : 0.26; })
                .labelsData(CITIES)
                .labelLat('lat').labelLng('lng')
                .labelText('n')
                .labelSize(function (d) { return d.hq ? 1.5 : 0.95; })
                .labelDotRadius(0)
                .labelIncludeDot(false)
                .labelAltitude(function (d) { return d.hq ? 0.2 : 0.08; })
                .labelColor(function (d) { return d.hq ? '#FFB48A' : '#FFFFFF'; })
                .labelResolution(3)
                .ringsData([hq])
                .ringColor(function () { return function (t) { return 'rgba(234,92,31,' + (1 - t) + ')'; }; })
                .ringMaxRadius(6)
                .ringPropagationSpeed(2)
                .ringRepeatPeriod(1500)
                .arcsData(arcs)
                .arcColor(function () { return ['rgba(234,92,31,0.95)', 'rgba(255,255,255,0.35)']; })
                .arcStroke(0.32)
                .arcDashLength(0.45)
                .arcDashGap(0.9)
                .arcDashAnimateTime(reduce ? 0 : 4200)
                .arcAltitudeAutoScale(0.4);

            var controls = g.controls();
            controls.autoRotate = !reduce;
            controls.autoRotateSpeed = 0.55;
            controls.enableZoom = false;
            controls.enablePan = false;
            g.pointOfView({ lat: 14, lng: 121, altitude: 2.2 });

            if (window.ResizeObserver) {
                new ResizeObserver(function () { g.width(el.clientWidth).height(el.clientHeight); }).observe(el);
            }
            if (window.IntersectionObserver) {
                new IntersectionObserver(function (entries) {
                    entries.forEach(function (en) { if (en.isIntersecting) g.resumeAnimation(); else g.pauseAnimation(); });
                }).observe(el);
            }
            el.classList.add('is-ready');
        }).catch(function () { el.classList.add('is-failed'); });
    }

    function init() {
        var els = document.querySelectorAll('[data-globe]');
        if (!els.length) return;
        els.forEach(function (el) {
            if (!('IntersectionObserver' in window)) { start(el); return; }
            var io = new IntersectionObserver(function (entries) {
                if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(el); }
            }, { rootMargin: '300px 0px' });
            io.observe(el);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
