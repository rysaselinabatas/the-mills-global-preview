/**
 * Lead magnet popup (gated download) for The Mills Global.
 * One guide per page: the page's .lm-strip[data-guide] element tells this
 * script which checklist to offer. Every id and class is suffixed with the
 * guide key (for example popupWrap_customs) so popups never clash.
 *
 * SETUP: set CONFIG.WEBHOOK_URL (services) and CONFIG.WEBHOOK_URL_INDUSTRY (industries) to the n8n production webhook URLs.
 * The hidden "guide" field carries the slug so one endpoint can route all 27.
 */
(function () {
    'use strict';

    var CONFIG = {
        WEBHOOK_URL: 'https://n8n.themillsglobal.com/webhook/mills-lead-magnet',            // n8n workflow for the 11 service checklists
        WEBHOOK_URL_INDUSTRY: 'https://n8n.themillsglobal.com/webhook/mills-lead-magnet-industry',   // n8n workflow for the 16 industry checklists (falls back to WEBHOOK_URL)
        SUPPORT_EMAIL: 'inquiry@themillsglobal.com',
        OPEN_AT_DEPTH: 0.3
    };

    var GUIDES = {
        "advisory": {
                "title": "Philippine Trade Regulation Readiness Checklist",
                "pdf": "assets/lead-magnets/advisory-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/advisory-cover.png"
        },
        "customs": {
                "title": "Customs Clearance Readiness Checklist",
                "pdf": "assets/lead-magnets/customs-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/customs-cover.png"
        },
        "dangerous-goods": {
                "title": "Dangerous Goods Shipping Readiness Checklist",
                "pdf": "assets/lead-magnets/dangerous-goods-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/dangerous-goods-cover.png"
        },
        "entry": {
                "title": "Philippine Market Entry Readiness Checklist",
                "pdf": "assets/lead-magnets/entry-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/entry-cover.png"
        },
        "insurance": {
                "title": "Marine Cargo Insurance Readiness Checklist",
                "pdf": "assets/lead-magnets/insurance-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/insurance-cover.png"
        },
        "logistics": {
                "title": "Post-Clearance Delivery Readiness Checklist",
                "pdf": "assets/lead-magnets/logistics-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/logistics-cover.png"
        },
        "marine": {
                "title": "Vessel and Marine Equipment Readiness Checklist",
                "pdf": "assets/lead-magnets/marine-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/marine-cover.png"
        },
        "packaging": {
                "title": "Export and Industrial Packaging Readiness Checklist",
                "pdf": "assets/lead-magnets/packaging-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/packaging-cover.png"
        },
        "permits": {
                "title": "Import Permit and Product Registration Checklist",
                "pdf": "assets/lead-magnets/permits-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/permits-cover.png"
        },
        "projects": {
                "title": "Project Cargo Readiness Checklist",
                "pdf": "assets/lead-magnets/projects-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/projects-cover.png"
        },
        "time-critical": {
                "title": "Priority Clearance Readiness Checklist",
                "pdf": "assets/lead-magnets/time-critical-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/time-critical-cover.png"
        },
        "industry-agriculture": {
                "title": "Agriculture, Plants, Animals and Fisheries Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-agriculture-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-agriculture-cover.png"
        },
        "industry-automotive": {
                "title": "Automotive, Heavy Equipment and Special-Purpose Vehicles Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-automotive-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-automotive-cover.png"
        },
        "industry-aviation": {
                "title": "Aviation and Aerospace Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-aviation-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-aviation-cover.png"
        },
        "industry-chemicals": {
                "title": "Chemicals and Controlled Materials Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-chemicals-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-chemicals-cover.png"
        },
        "industry-cold-chain": {
                "title": "Cold Chain and Temperature-Sensitive Cargo Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-cold-chain-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-cold-chain-cover.png"
        },
        "industry-construction": {
                "title": "Construction and Infrastructure Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-construction-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-construction-cover.png"
        },
        "industry-data-centers": {
                "title": "Data Centers and Digital Infrastructure Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-data-centers-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-data-centers-cover.png"
        },
        "industry-electronics-telecom": {
                "title": "Telecommunications, Electronics and IT Hardware Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-electronics-telecom-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-electronics-telecom-cover.png"
        },
        "industry-food-beverage": {
                "title": "Food, Beverage and FMCG Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-food-beverage-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-food-beverage-cover.png"
        },
        "industry-freight-forwarders": {
                "title": "Freight Forwarders and Logistics Providers Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-freight-forwarders-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-freight-forwarders-cover.png"
        },
        "industry-healthcare": {
                "title": "Pharmaceuticals, Medical Devices and Healthcare Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-healthcare-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-healthcare-cover.png"
        },
        "industry-manufacturing": {
                "title": "Manufacturing and Industrial Machinery Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-manufacturing-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-manufacturing-cover.png"
        },
        "industry-marine": {
                "title": "Marine, Vessels and Yachts Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-marine-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-marine-cover.png"
        },
        "industry-mining": {
                "title": "Mining, Minerals and Industrial Materials Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-mining-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-mining-cover.png"
        },
        "industry-renewable-energy": {
                "title": "Renewable Energy and Power Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-renewable-energy-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-renewable-energy-cover.png"
        },
        "industry-retail": {
                "title": "Retail, Consumer Goods and E-Commerce Import Readiness Checklist",
                "pdf": "assets/lead-magnets/industry-retail-readiness-checklist.pdf",
                "cover": "assets/lead-magnets/covers/industry-retail-cover.png"
        }
};

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function storageGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
    function storageSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }

    function track(name, params) {
        if (window.mtgTrack) window.mtgTrack(name, params);
    }

    var instances = {};

    // Builds the popup for one guide (once) and returns its controls.
    // autoOpen: also open it when the reader passes 30 percent of the page.
    function setup(slug, autoOpen) {
        if (instances[slug]) return instances[slug];
        var guide = GUIDES[slug];
        if (!guide) return null;
        var lastTrigger = 'scroll';
        var key = slug.replace(/-/g, '_');
        var photo = slug.indexOf('industry-') === 0 ? 'assets/images/' + slug + '.jpg' : 'assets/images/pexels-' + slug + '.jpg';
        var dismissKey = 'popupDismissed_' + key;
        var id = function (name) { return name + '_' + key; };

        var wrap = document.createElement('div');
        wrap.className = 'lm-popup lm-popup_' + key;
        wrap.id = id('popupWrap');
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', id('popupTitle'));
        wrap.hidden = true;
        wrap.innerHTML =
            '<div class="lm-popup__backdrop lm-popup__backdrop_' + key + '" id="' + id('popupBackdrop') + '"></div>' +
            '<div class="lm-popup__card lm-popup__card_' + key + '" data-lenis-prevent>' +
            '<button type="button" class="lm-popup__close lm-popup__close_' + key + '" id="' + id('popupClose') + '" aria-label="Close">&times;</button>' +
            '<div class="lm-popup__media lm-popup__media_' + key + '"><img src="' + esc(photo) + '" alt="" loading="lazy"></div>' +
            '<div class="lm-popup__body lm-popup__body_' + key + '" id="' + id('popupBody') + '">' +
            '<span class="lm-pill lm-pill_' + key + '">FREE CHECKLIST</span>' +
            '<h2 class="lm-popup__title lm-popup__title_' + key + '" id="' + id('popupTitle') + '">' + esc(guide.title) + '</h2>' +
            '<p class="lm-popup__lead lm-popup__lead_' + key + '">Twelve things to confirm before you book your next shipment. Enter your details and the checklist downloads right away.</p>' +
            '<form class="lm-form lm-form_' + key + '" id="' + id('popupForm') + '" novalidate>' +
            field(id('popupName'), 'Full name', 'text', 'name', 'name', 'Full name') +
            field(id('popupEmail'), 'Work email', 'email', 'email', 'email', 'Work email') +
            field(id('popupPhone'), 'Phone', 'tel', 'phone', 'tel', 'Phone, for example +63 917 123 4567') +
            field(id('popupCompany'), 'Company', 'text', 'company', 'organization', 'Company') +
            '<input type="text" name="website" id="' + id('popupHp') + '" class="lm-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
            '<input type="hidden" name="guide" value="' + esc(slug) + '">' +
            '<p class="lm-error lm-error_' + key + '" id="' + id('popupError') + '" role="alert" aria-live="polite"></p>' +
            '<button type="submit" class="lm-btn lm-btn_' + key + '" id="' + id('popupSubmit') + '">Download the Checklist</button>' +
            '</form>' +
            '<p class="lm-popup__trust lm-popup__trust_' + key + '">General guidance for importers. No spam.</p>' +
            '</div></div>';
        document.body.appendChild(wrap);

        function field(fid, label, type, name, ac, ph) {
            return '<div class="lm-field"><label for="' + fid + '">' + label + '</label>' +
                '<input id="' + fid + '" name="' + name + '" type="' + type + '" autocomplete="' + ac + '" placeholder="' + ph + '"' +
                (name === 'phone' ? ' inputmode="tel" pattern="[0-9+()\\-\\s]{7,20}"' : '') + ' required></div>';
        }

        var form = document.getElementById(id('popupForm'));
        var errorEl = document.getElementById(id('popupError'));
        var submitBtn = document.getElementById(id('popupSubmit'));
        var body = document.getElementById(id('popupBody'));
        var lastFocus = null;
        var opened = false;

        function open(manual, trigger) {
            if (!manual && storageGet(dismissKey)) return;
            lastTrigger = trigger || (manual ? 'button' : 'scroll');
            track('lead_magnet_open', { guide: slug, guide_title: guide.title, trigger: lastTrigger });
            lastFocus = document.activeElement;
            wrap.hidden = false;
            document.documentElement.classList.add('lm-lock');
            opened = true;
            var first = document.getElementById(id('popupName'));
            if (first) setTimeout(function () { first.focus(); }, 60);
        }

        function close() {
            if (!wrap.hidden) track('lead_magnet_dismiss', { guide: slug, guide_title: guide.title, trigger: lastTrigger });
            wrap.hidden = true;
            document.documentElement.classList.remove('lm-lock');
            storageSet(dismissKey, '1');
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        document.getElementById(id('popupClose')).addEventListener('click', close);
        document.getElementById(id('popupBackdrop')).addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !wrap.hidden) close();
        });

        // Open once the reader is 30 percent of the way down the page
        function onScroll() {
            if (opened || storageGet(dismissKey)) return;
            var scrollable = document.documentElement.scrollHeight - window.innerHeight;
            if (scrollable <= 0) return;
            if (window.pageYOffset / scrollable >= CONFIG.OPEN_AT_DEPTH) {
                open(false);
                window.removeEventListener('scroll', onScroll);
            }
        }
        if (autoOpen) window.addEventListener('scroll', onScroll, { passive: true });

        // Live character filtering for the phone field
        var phone = document.getElementById(id('popupPhone'));
        phone.addEventListener('input', function () {
            var cleaned = phone.value.replace(/[^0-9+()\-\s]/g, '');
            if (cleaned !== phone.value) phone.value = cleaned;
        });

        function validate(v) {
            if (v.name.trim().length < 2) return { id: 'popupName', msg: 'Please enter your full name.' };
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) return { id: 'popupEmail', msg: 'Enter a work email like name@company.com.' };
            var digits = v.phone.replace(/\D/g, '');
            if (digits.length < 7 || digits.length > 15) return { id: 'popupPhone', msg: 'Enter a phone number with 7 to 15 digits, for example +63 917 123 4567.' };
            if (v.company.trim().length < 2) return { id: 'popupCompany', msg: 'Please enter your company name.' };
            return null;
        }

        var webhookUrl = (slug.indexOf('industry-') === 0 && CONFIG.WEBHOOK_URL_INDUSTRY) || CONFIG.WEBHOOK_URL;

        function send(payload) {
            var data = new URLSearchParams(payload).toString();
            return fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: data
            }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); });
        }

        function succeed(firstName) {
            storageSet(dismissKey, '1');
            track('generate_lead', { lead_source: 'lead_magnet', guide: slug, guide_title: guide.title, trigger: lastTrigger });
            if (window.mtgConversion) window.mtgConversion('form');
            track('lead_magnet_download', { guide: slug, guide_title: guide.title, file_name: guide.pdf.split('/').pop() });
            body.innerHTML =
                '<span class="lm-pill lm-pill_' + key + '">FREE CHECKLIST</span>' +
                '<h2 class="lm-popup__title lm-popup__title_' + key + '" id="' + id('popupTitle') + '">Thank you' + (firstName ? ', ' + esc(firstName) : '') + '.</h2>' +
                '<p class="lm-popup__lead lm-popup__lead_' + key + '">Your checklist is downloading now. If nothing happens, <a class="lm-link" id="' + id('popupDownload') + '" href="' + esc(guide.pdf) + '" download>use this direct link</a>.</p>' +
                '<p class="lm-popup__trust lm-popup__trust_' + key + '">General guidance for importers. No spam.</p>';
            var a = document.createElement('a');
            a.href = guide.pdf;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            errorEl.innerHTML = '';
            var v = {
                name: document.getElementById(id('popupName')).value,
                email: document.getElementById(id('popupEmail')).value,
                phone: phone.value,
                company: document.getElementById(id('popupCompany')).value
            };
            var bad = validate(v);
            if (bad) {
                errorEl.textContent = bad.msg;
                document.getElementById(id(bad.id)).focus();
                return;
            }
            if (document.getElementById(id('popupHp')).value) return; // honeypot
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            var firstName = v.name.trim().split(/\s+/)[0];
            if (!webhookUrl) {
                console.warn('lead-magnet: CONFIG.WEBHOOK_URL is empty, submission was not sent anywhere.');
                succeed(firstName);
                return;
            }
            var payload = {
                guide: slug,
                guide_title: guide.title,
                name: v.name.trim(),
                email: v.email.trim(),
                phone: v.phone.trim(),
                company: v.company.trim(),
                page: window.location.href,
                submitted_at: new Date().toISOString()
            };
            var attr = window.mtgAttribution ? window.mtgAttribution() : {};
            Object.keys(attr).forEach(function (k) { payload[k] = attr[k]; });
            send(payload).catch(function () {
                return new Promise(function (r) { setTimeout(r, 1200); }).then(function () { return send(payload); });
            }).then(function () {
                succeed(firstName);
            }).catch(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Download the Checklist';
                track('lead_magnet_error', { guide: slug, guide_title: guide.title });
                errorEl.innerHTML = 'Something went wrong sending your details. Please try again, or email <a class="lm-link" href="mailto:' + CONFIG.SUPPORT_EMAIL + '?subject=' + encodeURIComponent(guide.title) + '">' + CONFIG.SUPPORT_EMAIL + '</a> and we will send the checklist.';
            });
        });

        instances[slug] = { open: open };
        return instances[slug];
    }

    function init() {
        // End-of-page strip pages: this page's guide also opens at 30 percent scroll
        var strip = document.querySelector('.lm-strip[data-guide]');
        if (strip) setup(strip.getAttribute('data-guide'), true);

        // Any element with data-open="<slug>" opens that guide's popup.
        // Optional data-trigger names where the click came from, for analytics.
        document.addEventListener('click', function (e) {
            var t = e.target.closest ? e.target.closest('[data-open]') : null;
            if (!t) return;
            var inst = setup(t.getAttribute('data-open'), false);
            if (!inst) return;
            e.preventDefault();
            inst.open(true, t.getAttribute('data-trigger') || 'button');
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
