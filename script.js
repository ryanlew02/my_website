(function () {
    const THEMES = ['dark', 'light'];

    const ICONS = {
        light: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>`,
        dark: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>`,
    };

    const LABELS = { light: 'Light', dark: 'Dark' };

    // Respect the OS "reduce motion" setting for programmatic scrolling.
    function scrollBehavior() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto' : 'smooth';
    }

    // ── Project data ──────────────────────────────────────────────────────────
    // Add a new project by appending an object here. `image` is optional —
    // cards without it render as text-only. `external: true` opens in a new tab.
    const PROJECTS = [
        {
            title: 'DivergeOS',
            status: 'Live Demo',
            href: 'divergeos/index.html',
            image: { src: 'assets/divergeos_2.jpg', alt: 'DivergeOS desktop with the Manifesto, Terminal, Calculator, and Chess apps open', pos: 'center 20%' },
            desc: 'A fully functional desktop OS simulation that runs in the browser, themed around the Divergent universe. Complete with a real window manager, 12 working apps, faction-based themes, and a virtual file system.',
            bullets: [
                'Window manager with drag, resize, minimize, maximize, and z-index stacking',
                'Chess engine with minimax AI, alpha-beta pruning, and 3 difficulty levels',
                '6 complete faction themes powered by CSS custom properties at runtime',
                'Ships as a PWA — installable and fully offline-capable'
            ],
            tags: ['React', 'TypeScript', 'Vite', 'Zustand', 'CSS Modules']
        },
        {
            title: 'Inner City',
            status: 'Live on App Store',
            href: 'innercity/index.html',
            image: { src: 'assets/1.1.0_1.jpg', alt: 'Inner City app showing an isometric city that grows as habits are completed' },
            desc: 'A mobile habit-tracking app that gamifies your daily routines. Complete habits to construct buildings and watch your city grow on an isometric grid.',
            bullets: [
                'Published and available on the iOS App Store',
                'Isometric city that expands in real time as habits are completed',
                'Stats dashboard with heatmaps and weekly, monthly, and yearly breakdowns',
                'Supports both "build" habits and "quit" habits with streak tracking'
            ],
            tags: ['React Native', 'Expo', 'TypeScript', 'SQLite']
        },
        {
            title: 'League of Legends Discord Bot',
            href: 'https://github.com/ryanlew02/lol-inted-bot',
            external: true,
            desc: "A Discord bot that pulls live match data from Riot Games' API, parses player performance, and delivers a humorous verdict directly to the server.",
            bullets: [
                'Integrates with Riot Games API to fetch real-time match history',
                'Analyzes KDA, damage output, vision score, and objective participation',
                'Generates and posts performance verdicts to Discord channels'
            ],
            tags: ['Python', 'Riot Games API', 'Discord.py']
        },
        {
            title: 'This Portfolio',
            href: 'https://github.com/ryanlew02/my_website',
            external: true,
            desc: 'Built from scratch with zero dependencies — no frameworks, no libraries. Pure HTML, CSS, and vanilla JavaScript.',
            bullets: [
                'Fully responsive layout using CSS Grid and fluid <code>clamp()</code> typography',
                'Dark / light theme system with CSS custom properties and localStorage',
                'Subtle particle effects and ambient animations via the Web Animations API'
            ],
            tags: ['HTML', 'CSS', 'JavaScript']
        }
    ];

    // ── Certifications data ───────────────────────────────────────────────────
    // Add a certification by appending an object. `href` is optional — with it,
    // the card becomes a link to the credential. `external: true` opens a new tab.
    const CERTIFICATIONS = [
        {
            tab: 'Codecademy',
            name: 'Computer Science Professional Certification',
            issuer: 'Codecademy',
            date: 'Issued Apr 2026 · Credential ID 0E76DC4D-B',
            bullets: [
                'Python',
                'Data Structures',
                'Algorithms',
                'Git',
                'PostgreSQL'
            ],
            href: 'https://www.codecademy.com/profiles/ryanlew02/certificates/05009c20e9174378acd37e6c2d0fbfc4'
        }
    ];

    function escapeHTML(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function projectCardHTML(p) {
        var ext = p.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        var status = p.status ? '<span class="project-status">' + escapeHTML(p.status) + '</span>' : '';
        var pos = p.image && p.image.pos ? ' style="--media-pos:' + p.image.pos + '"' : '';
        var media = p.image
            ? '<div class="project-media"><img src="' + p.image.src + '" alt="' + escapeHTML(p.image.alt) + '" loading="lazy"' + pos + '></div>'
            : '';
        var bullets = p.bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('');
        var tags = p.tags.map(function (t) { return '<span class="tech-tag">' + escapeHTML(t) + '</span>'; }).join('');
        return '' +
            '<li>' +
                '<a class="project" href="' + p.href + '"' + ext + '>' +
                    media +
                    '<div class="project-body">' +
                        '<div class="project-top">' +
                            '<div class="project-title-row"><strong>' + escapeHTML(p.title) + '</strong>' + status + '</div>' +
                            '<span class="arrow" aria-hidden="true">↗</span>' +
                        '</div>' +
                        '<p class="desc">' + p.desc + '</p>' +
                        '<ul class="project-bullets">' + bullets + '</ul>' +
                        '<div class="project-tags">' + tags + '</div>' +
                    '</div>' +
                '</a>' +
            '</li>';
    }

    function certPanelHTML(c, i) {
        var issuer = c.issuer ? ' <span class="tab-accent">@ ' + escapeHTML(c.issuer) + '</span>' : '';
        var date = c.date ? '<p class="tab-date">' + escapeHTML(c.date) + '</p>' : '';
        var bullets = (c.bullets || []).map(function (b) { return '<li>' + b + '</li>'; }).join('');
        var link = c.href
            ? '<a class="tab-link" href="' + c.href + '" target="_blank" rel="noopener noreferrer">View credential <span aria-hidden="true">↗</span></a>'
            : '';
        return '<div class="tab-panel" role="tabpanel" id="certpanel-' + i + '" aria-labelledby="certtab-' + i + '" tabindex="0">' +
                '<h3 class="tab-title">' + escapeHTML(c.name) + issuer + '</h3>' +
                date +
                '<ul class="tab-bullets">' + bullets + '</ul>' +
                link +
            '</div>';
    }

    function initCertTabs() {
        var root = document.getElementById('certTabs');
        if (!root) return;
        var tablist = root.querySelector('.tab-list');
        var panels = root.querySelector('.tab-panels');
        if (!tablist || !panels) return;

        tablist.innerHTML = CERTIFICATIONS.map(function (c, i) {
            return '<button class="tab" type="button" role="tab" id="certtab-' + i + '" ' +
                'aria-controls="certpanel-' + i + '" aria-selected="' + (i === 0) + '" ' +
                'tabindex="' + (i === 0 ? 0 : -1) + '">' + escapeHTML(c.tab || c.name) + '</button>';
        }).join('') + '<span class="tab-indicator" aria-hidden="true"></span>';
        panels.innerHTML = CERTIFICATIONS.map(certPanelHTML).join('');

        var tabs = Array.prototype.slice.call(tablist.querySelectorAll('.tab'));
        var panelEls = Array.prototype.slice.call(panels.querySelectorAll('.tab-panel'));
        var indicator = tablist.querySelector('.tab-indicator');
        if (!tabs.length) return;

        function moveIndicator(i) {
            var t = tabs[i];
            if (getComputedStyle(tablist).flexDirection === 'row') {
                indicator.style.transform = 'translateX(' + t.offsetLeft + 'px)';
                indicator.style.width = t.offsetWidth + 'px';
                indicator.style.height = '2px';
            } else {
                indicator.style.transform = 'translateY(' + t.offsetTop + 'px)';
                indicator.style.height = t.offsetHeight + 'px';
                indicator.style.width = '2px';
            }
        }
        function select(i) {
            tabs.forEach(function (t, j) {
                var on = j === i;
                t.setAttribute('aria-selected', on);
                t.tabIndex = on ? 0 : -1;
                t.classList.toggle('active', on);
            });
            panelEls.forEach(function (p, j) { p.classList.toggle('active', j === i); });
            moveIndicator(i);
        }
        function activeIndex() {
            for (var k = 0; k < tabs.length; k++) if (tabs[k].classList.contains('active')) return k;
            return 0;
        }

        tabs.forEach(function (t, i) {
            t.addEventListener('click', function () { select(i); });
            t.addEventListener('keydown', function (e) {
                var ni = null;
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') ni = (i + 1) % tabs.length;
                else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ni = (i - 1 + tabs.length) % tabs.length;
                if (ni !== null) { e.preventDefault(); select(ni); tabs[ni].focus(); }
            });
        });

        select(0);
        window.addEventListener('resize', function () { moveIndicator(activeIndex()); });
    }

    function initProjectCarousel() {
        var track = document.getElementById('projectTrack');
        if (!track) return;
        track.innerHTML = PROJECTS.map(projectCardHTML).join('');

        var prev = document.querySelector('.carousel-prev');
        var next = document.querySelector('.carousel-next');
        var dotsWrap = document.getElementById('projectDots');
        var cards = Array.prototype.slice.call(track.children);
        if (!cards.length) return;

        if (dotsWrap) {
            dotsWrap.innerHTML = cards.map(function (_, i) {
                return '<button class="carousel-dot" type="button" aria-label="Go to project ' + (i + 1) + '"></button>';
            }).join('');
        }
        var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.children) : [];

        // Where an active card's left edge sits = visible sliver + gap. Read from
        // the CSS `scroll-padding-left` so it stays in sync across breakpoints (the
        // peek-slot padding on .project-list is what keeps the peek a constant width).
        function peek() { return parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0; }

        // The carousel's position is tracked here rather than re-derived from a
        // (possibly mid-animation) scrollLeft, so the arrows never fire a no-op.
        var current = 0;

        function step() {
            return cards.length > 1 ? (cards[1].offsetLeft - cards[0].offsetLeft) : track.clientWidth;
        }
        function gap() { return cards.length > 1 ? step() - cards[0].offsetWidth : 0; }
        // How many whole cards fit in the viewable area (2 on desktop, 1 on phones).
        function visibleCount() {
            return Math.max(1, Math.round((track.clientWidth - 2 * peek() + gap()) / step()));
        }
        // Furthest-left index that still fills the view (no trailing empty space).
        function maxIndex() { return Math.max(0, cards.length - visibleCount()); }
        function clamp(i) { return Math.max(0, Math.min(maxIndex(), i)); }
        function targetFor(i) {
            var max = track.scrollWidth - track.clientWidth;
            return Math.min(max, Math.max(0, cards[clamp(i)].offsetLeft - peek()));
        }
        // Nearest snap index for the current scroll position (after a manual swipe).
        function nearestIndex() {
            return clamp(Math.round((track.scrollLeft - cards[0].offsetLeft + peek()) / step()));
        }
        function go(i) {
            current = clamp(i);
            track.scrollTo({ left: targetFor(current), behavior: scrollBehavior() });
            update();
        }
        function update() {
            dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
            if (prev) prev.disabled = current <= 0;
            if (next) next.disabled = current >= maxIndex();
        }

        if (prev) prev.addEventListener('click', function () { go(current - 1); });
        if (next) next.addEventListener('click', function () { go(current + 1); });
        dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });

        // Clicking a fully-shown card follows its link; clicking a card that is
        // only peeking in at a side slides the carousel one step toward it.
        // This is decided from the card's live on-screen position rather than the
        // tracked `current` index — `current` lags a manual swipe (it only resyncs
        // 120ms after scrolling stops), so trusting it would sometimes misjudge a
        // peeking card as fully visible (following the link) or move from the wrong
        // base. Re-deriving the rested index here also keeps the move to exactly
        // one card, never two.
        track.addEventListener('click', function (e) {
            // Resolve to the card's own <li> via its anchor — closest('li') would
            // wrongly match the bullet <li> elements inside the card body.
            var card = e.target.closest('a.project');
            if (!card || card.parentNode.parentNode !== track) return;
            var li = card.parentNode;
            var viewLeft = track.scrollLeft;
            var viewRight = viewLeft + track.clientWidth;
            var cardLeft = li.offsetLeft;
            var cardRight = cardLeft + li.offsetWidth;
            // 1px tolerance so a card resting flush against an edge counts as full.
            if (cardLeft >= viewLeft - 1 && cardRight <= viewRight + 1) return;
            e.preventDefault();
            current = nearestIndex();
            go(cardLeft < viewLeft ? current - 1 : current + 1);
        });

        // Keep `current` in sync when the user scrolls/swipes the track by hand,
        // then re-align to the exact target so the side peek is always uniform
        // (a manual swipe under `proximity` snapping can rest at any offset).
        var settle;
        track.addEventListener('scroll', function () {
            window.clearTimeout(settle);
            settle = window.setTimeout(function () {
                current = nearestIndex();
                var target = targetFor(current);
                if (Math.abs(track.scrollLeft - target) > 1) {
                    track.scrollTo({ left: target, behavior: scrollBehavior() });
                }
                update();
            }, 120);
        });
        track.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
        });
        window.addEventListener('resize', function () {
            current = clamp(current);
            track.scrollLeft = targetFor(current);
            update();
        });
        update();
    }

    function getTheme() {
        return localStorage.getItem('theme') || 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('theme', theme);

        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.innerHTML = ICONS[theme];
            btn.title = `Theme: ${LABELS[theme]}`;
            btn.setAttribute('aria-label', `Switch theme — current: ${LABELS[theme]}`);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(getTheme());
        initProjectCarousel();
        initCertTabs();

        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.addEventListener('click', function () {
                const current = getTheme();
                const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
                applyTheme(next);
            });
        }

        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // ── Section navigation ────────────────────────────────────────────────
        var scrollContainer = document.getElementById('scroll-container');
        if (scrollContainer) {
            window.scrollTo(0, 0);
            // Smooth-scroll to the target section on anchor click
            document.querySelectorAll('a[href^="#"]').forEach(function (a) {
                a.addEventListener('click', function (e) {
                    var id = a.getAttribute('href').slice(1);
                    var target = document.getElementById(id);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
                    }
                });
            });

            // IntersectionObserver keeps dots in sync with visible section
            var dots     = document.querySelectorAll('.dot');
            var sections = document.querySelectorAll('.snap-section');
            if (dots.length && sections.length) {
                var io = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            var id = entry.target.id;
                            dots.forEach(function (dot) {
                                dot.classList.toggle(
                                    'active',
                                    dot.getAttribute('href') === '#' + id
                                );
                            });
                        }
                    });
                }, { root: null, threshold: 0.5 });
                sections.forEach(function (s) { io.observe(s); });
            }
        }

        document.querySelectorAll('.copy-email').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var email = btn.dataset.email;

                function onSuccess() {
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(function () {
                        btn.textContent = 'Email';
                        btn.classList.remove('copied');
                    }, 2000);
                }

                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(email).then(onSuccess);
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = email;
                    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    try { document.execCommand('copy'); onSuccess(); } catch (e) {}
                    document.body.removeChild(ta);
                }
            });
        });
    });
})();

// ─── Interactive Particle Effects ─────────────────────────────────────────
(function () {

    // ── Spark Burst ──────────────────────────────────────────────────────────
    var SPARK_COLORS = ['#c9a84c', '#e0c068', '#ffd060', '#a87830', '#ffe090', '#d4a850'];

    function spawnSparks(x, y, count) {
        for (var i = 0; i < count; i++) spawnSpark(x, y);
    }

    function spawnSpark(x, y) {
        var el = document.createElement('div');
        var size = 3 + Math.random() * 4;
        var color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];

        el.style.cssText =
            'position:fixed;pointer-events:none;z-index:9999;border-radius:50%;' +
            'left:' + (x - size / 2) + 'px;top:' + (y - size / 2) + 'px;' +
            'width:' + size + 'px;height:' + size + 'px;' +
            'background:' + color + ';' +
            'box-shadow:0 0 ' + (size * 2.5) + 'px ' + color + ';';
        document.body.appendChild(el);

        var angle = Math.random() * Math.PI * 2;
        var dist = 45 + Math.random() * 65;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist - 18;
        var dur = 360 + Math.random() * 260;

        el.animate([
            { transform: 'translate(0,0) scale(1)',                                      opacity: 1 },
            { transform: 'translate(' + dx * 0.35 + 'px,' + dy * 0.35 + 'px) scale(1.3)', opacity: 0.85, offset: 0.25 },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0)',               opacity: 0 }
        ], { duration: dur, easing: 'ease-out', fill: 'forwards' }).onfinish = function () {
            el.remove();
        };
    }

    // ── Attach Spark Bursts to Interactive Elements ──────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.btn, .resume-btn').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                var r = el.getBoundingClientRect();
                spawnSparks(r.left + r.width / 2, r.top + r.height / 2, 6);
            });
        });
    });

    // ── Ambient Floating Particles ───────────────────────────────────────────
    function spawnEmber() {
        var el = document.createElement('div');
        var size = 1.5 + Math.random() * 2;
        var x = Math.random() * window.innerWidth;

        el.style.cssText =
            'position:fixed;pointer-events:none;z-index:1;border-radius:50%;' +
            'left:' + x + 'px;bottom:-8px;' +
            'width:' + size + 'px;height:' + size + 'px;' +
            'background:#c9a84c;' +
            'box-shadow:0 0 ' + (size * 3) + 'px #c9a84c;';
        document.body.appendChild(el);

        var drift = (Math.random() - 0.5) * 90;
        var rise = 180 + Math.random() * 260;
        var dur = 4500 + Math.random() * 4000;

        el.animate([
            { transform: 'translate(0,0)',                                           opacity: 0   },
            { transform: 'translate(' + drift * 0.2 + 'px,-' + rise * 0.15 + 'px)', opacity: 0.85, offset: 0.12 },
            { transform: 'translate(' + drift + 'px,-' + rise + 'px)',               opacity: 0   }
        ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' }).onfinish = function () {
            el.remove();
        };
    }

    setInterval(spawnEmber, 3500);
    for (var i = 0; i < 2; i++) setTimeout(spawnEmber, Math.random() * 3000);

})();
