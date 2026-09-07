/**
 * IntersectionObserver-based reveal animations and stat counters.
 * Self-initializes on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll Reveal
    const revealElements = document.querySelectorAll('.animate-in');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // 2. Stat Counter Animation
    const statElements = document.querySelectorAll('.stat-number[data-target]');
    if (statElements.length > 0) {
        const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
        const DURATION = 2000;

        const statObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const targetStr = el.getAttribute('data-target');
                    const target = parseFloat(targetStr);
                    if (isNaN(target)) return;

                    const suffix = el.getAttribute('data-suffix') || '';
                    const prefix = el.getAttribute('data-prefix') || '';
                    const isInt = target % 1 === 0;

                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const elapsed = timestamp - startTimestamp;
                        let progress = Math.min(elapsed / DURATION, 1);
                        
                        const easedProgress = easeOutQuart(progress);
                        const currentVal = easedProgress * target;
                        
                        let displayVal = isInt ? Math.round(currentVal).toString() : currentVal.toFixed(1);
                        
                        el.textContent = `${prefix}${displayVal}${suffix}`;
                        
                        if (progress < 1) {
                            requestAnimationFrame(step);
                        } else {
                            // Ensure final value is exact
                            el.textContent = `${prefix}${isInt ? target : target.toFixed(1)}${suffix}`;
                        }
                    };
                    
                    requestAnimationFrame(step);
                    observer.unobserve(el);
                }
            });
        }, {
            threshold: 0.5
        });

        statElements.forEach(el => statObserver.observe(el));
    }

    // 3. Services Slider — arrow nav + tap-to-reveal on touch devices
    // (CSS :hover/:focus-within already handles mouse + keyboard).
    const slider = document.getElementById('services-slider');
    if (slider) {
        const arrows = document.querySelectorAll('.services-slider__arrow');
        arrows.forEach(arrow => {
            arrow.addEventListener('click', () => {
                const dir = parseFloat(arrow.getAttribute('data-dir')) || 1;
                const card = slider.querySelector('.service-slide');
                const step = card ? card.getBoundingClientRect().width + 24 : 300;
                slider.scrollBy({ left: dir * step, behavior: 'smooth' });
            });
        });

        const isTouch = !(window.matchMedia && window.matchMedia('(hover: hover)').matches);
        if (isTouch) {
            const slides = slider.querySelectorAll('.service-slide');
            slides.forEach(slide => {
                slide.addEventListener('click', () => {
                    const wasOpen = slide.classList.contains('is-open');
                    slides.forEach(s => s.classList.remove('is-open'));
                    if (!wasOpen) slide.classList.add('is-open');
                });
                const link = slide.querySelector('.service-slide__link');
                if (link) link.addEventListener('click', (e) => e.stopPropagation());
            });
        }
    }

    // 4. Contact Form — composes a pre-filled mailto (static site, no backend)
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = new FormData(contactForm);
            const name = (data.get('name') || '').toString().trim();
            const company = (data.get('company') || '').toString().trim();
            const email = (data.get('email') || '').toString().trim();
            const message = (data.get('message') || '').toString().trim();
            const service = contactForm.getAttribute('data-service');

            const subjectLead = service ? `${service} inquiry` : 'Quote request';
            const subject = `${subjectLead} from ${name}${company ? ' — ' + company : ''}`;
            const bodyLines = [
                message || '(No details provided)',
                '',
                service ? `Service: ${service}` : null,
                `Name: ${name}`,
                company ? `Company: ${company}` : null,
                `Reply-to email: ${email}`
            ].filter(Boolean);

            const mailtoUrl = `mailto:inquiry@themillsglobal.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
            window.location.href = mailtoUrl;
        });
    }

    // 5. FAQ Accordion — each item toggles independently (not exclusive)
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            if (item) item.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', item && item.classList.contains('is-open') ? 'true' : 'false');
        });
    });

    // 6. Mobile Nav Toggle
    const navEl = document.getElementById('nav');
    const mobileToggle = document.querySelector('.nav__mobile-toggle');
    if (navEl && mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const isOpen = navEl.classList.toggle('mobile-open');
            mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });
        navEl.querySelectorAll('.nav__mobile-panel a').forEach((link) => {
            link.addEventListener('click', () => {
                navEl.classList.remove('mobile-open');
                mobileToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navEl.classList.contains('mobile-open')) {
                navEl.classList.remove('mobile-open');
                mobileToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    }

    // 7. Service Pill Hover Preview — small card that follows the cursor
    // near the hovered "Connected Services" pill on industry pages.
    const previewPills = document.querySelectorAll('.industry-pill[data-preview-desc]');
    if (previewPills.length > 0 && window.matchMedia('(hover: hover)').matches) {
        const preview = document.createElement('div');
        preview.className = 'pill-preview';
        preview.innerHTML = `
            <img class="pill-preview__img" alt="">
            <div class="pill-preview__body">
                <p class="pill-preview__title"></p>
                <p class="pill-preview__desc"></p>
            </div>
        `;
        document.body.appendChild(preview);
        const previewImg = preview.querySelector('.pill-preview__img');
        const previewTitle = preview.querySelector('.pill-preview__title');
        const previewDesc = preview.querySelector('.pill-preview__desc');

        const positionPreview = (e) => {
            const margin = 16;
            const rect = preview.getBoundingClientRect();
            let x = e.clientX + margin;
            let y = e.clientY + margin;
            if (x + rect.width > window.innerWidth - 12) x = e.clientX - rect.width - margin;
            if (y + rect.height > window.innerHeight - 12) y = e.clientY - rect.height - margin;
            preview.style.left = `${Math.max(12, x)}px`;
            preview.style.top = `${Math.max(12, y)}px`;
        };

        previewPills.forEach((pill) => {
            pill.addEventListener('mouseenter', (e) => {
                previewImg.src = pill.getAttribute('data-preview-img') || '';
                previewTitle.textContent = pill.getAttribute('data-preview-title') || '';
                previewDesc.textContent = pill.getAttribute('data-preview-desc') || '';
                positionPreview(e);
                preview.classList.add('is-visible');
            });
            pill.addEventListener('mousemove', positionPreview);
            pill.addEventListener('mouseleave', () => {
                preview.classList.remove('is-visible');
            });
        });
    }

    // 8. Smooth Scroll for Nav Links
    const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
