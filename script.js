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

    // ── Project data ──────────────────────────────────────────────────────────
    // Add a new project by appending an object here. `image` is optional —
    // cards without it render as text-only. `external: true` opens in a new tab.
    const PROJECTS = [
        {
            title: 'DivergeOS',
            status: 'Live Demo',
            href: 'divergeos/index.html',
            image: { src: 'assets/divergeos_2.png', alt: 'DivergeOS desktop with the Manifesto, Terminal, Calculator, and Chess apps open', pos: 'center 20%' },
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
            image: { src: 'assets/1.1.0_1.png', alt: 'Inner City app showing an isometric city that grows as habits are completed' },
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

        function step() {
            return cards.length > 1 ? (cards[1].offsetLeft - cards[0].offsetLeft) : track.clientWidth;
        }
        function clamp(i) { return Math.max(0, Math.min(cards.length - 1, i)); }
        function index() { return clamp(Math.round(track.scrollLeft / step())); }
        function go(i) { track.scrollTo({ left: step() * clamp(i), behavior: 'smooth' }); }
        function update() {
            var idx = index();
            dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
            var maxScroll = track.scrollWidth - track.clientWidth - 2;
            if (prev) prev.disabled = track.scrollLeft <= 2;
            if (next) next.disabled = track.scrollLeft >= maxScroll;
        }

        if (prev) prev.addEventListener('click', function () { go(index() - 1); });
        if (next) next.addEventListener('click', function () { go(index() + 1); });
        dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
        track.addEventListener('scroll', function () { window.requestAnimationFrame(update); });
        track.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
        });
        window.addEventListener('resize', function () { window.requestAnimationFrame(update); });
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
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
