(function () {
    // Respect the OS "reduce motion" setting for programmatic scrolling.
    function scrollBehavior() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto' : 'smooth';
    }

    // ── Project data ──────────────────────────────────────────────────────────
    // Add a new project by appending an object here. `image` (or `video`, a
    // muted looping clip) is optional — cards without either render as
    // text-only. `external: true` opens in a new tab.
    // HANDWRITTEN_PROJECTS feeds the "Handwritten Projects" section; PROJECTS
    // feeds "AI Assisted Projects".
    const HANDWRITTEN_PROJECTS = [
        {
            title: '2D Particle Gravity Sim',
            href: 'https://github.com/ryanlew02/2D_particle_gravity_sim',
            external: true,
            video: { src: 'assets/particle_sim_demo.mp4', poster: 'assets/particle_sim_poster.jpg', label: 'Particles orbiting and colliding in the gravity simulation' },
            desc: 'A real-time 2D gravitational physics simulation built from scratch in C++ and OpenGL. Particles of varying mass, density, and velocity pull on each other under Newtonian gravity and collide as they orbit.',
            bullets: [
                'Pairwise Newtonian gravity integrated on a fixed physics timestep',
                'Particle collision detection and response',
                'Mass derived from density and area, so size and weight stay consistent',
                'Hardware-accelerated rendering with clean separation of physics, rendering, and app logic'
            ],
            tags: ['C++', 'OpenGL', 'GLFW', 'GLAD', 'CMake']
        }
    ];

    const PROJECTS = [
        {
            title: 'HalfLight',
            href: 'halflight/',
            image: { src: 'assets/halflight_banner.jpg', alt: 'HalfLight on three iPhones: the dream feed, the home screen, and a profile' },
            desc: 'An AI-assisted dream journal and lucid-dreaming guide for iOS. Offline-first SwiftUI client, a Postgres backend locked down by row-level security, and server-side AI that no client can run up the bill on.',
            bullets: [
                'Offline-first sync with tombstones and last-write-wins conflict resolution',
                'Custom feed ranking on like-per-view conversion, smoothed and batch-normalized',
                'On-device semantic search over dreams using Apple’s sentence embeddings',
                'Apple receipt JWS + x509 chain verified server-side, gating every AI call'
            ],
            tags: ['SwiftUI', 'SwiftData', 'Supabase', 'Postgres / RLS', 'Deno', 'Claude API', 'StoreKit 2']
        },
        {
            title: 'DivergeOS',
            status: 'Live Demo',
            href: 'divergeos/',
            image: { src: 'assets/divergeos_2.jpg', alt: 'DivergeOS desktop with the Manifesto, Terminal, Calculator, and Chess apps open', pos: 'center 20%' },
            desc: 'A fully functional desktop OS simulation that runs in the browser, themed around the Divergent universe. Complete with a real window manager, 12 working apps, faction-based themes, and a virtual file system.',
            bullets: [
                'Window manager with drag, resize, minimize, maximize, and z-index stacking',
                'Chess engine with minimax AI, alpha-beta pruning, and 3 difficulty levels',
                '6 complete faction themes powered by CSS custom properties at runtime',
                'Ships as a PWA, installable and fully offline-capable'
            ],
            tags: ['React', 'TypeScript', 'Vite', 'Zustand', 'CSS Modules']
        },
        {
            title: 'Inner City',
            status: 'Live on App Store',
            href: 'innercity/',
            image: { src: 'assets/1.1.0_1.jpg', alt: 'Inner City app showing an isometric city that grows as habits are completed' },
            desc: 'A mobile habit-tracking app that gamifies your daily routines. Complete habits to construct buildings and watch your city grow on an isometric grid.',
            bullets: [
                'Published and available on the iOS App Store',
                'Isometric city that expands in real time as habits are completed',
                'Stats dashboard with heatmaps and weekly, monthly, and yearly breakdowns',
                'Supports both "build" habits and "quit" habits with streak tracking'
            ],
            tags: ['React Native', 'Expo', 'TypeScript', 'SQLite']
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
        var media = p.video
            ? '<div class="project-media"><video src="' + p.video.src + '"' + (p.video.poster ? ' poster="' + p.video.poster + '"' : '') + ' aria-label="' + escapeHTML(p.video.label) + '" muted loop playsinline preload="none"></video></div>'
            : p.image
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

    // Card videos only play while on screen, which saves battery and data on
    // phones. The poster shows until then, and stays if autoplay is refused
    // (iOS Low Power Mode) or the viewer prefers reduced motion.
    function initCardVideos(root) {
        var videos = Array.prototype.slice.call(root.querySelectorAll('video'));
        if (!videos.length) return;
        videos.forEach(function (v) { v.muted = true; });   // iOS needs the property, not just the attribute
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!('IntersectionObserver' in window)) {
            videos.forEach(function (v) { v.play().catch(function () {}); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) e.target.play().catch(function () {});
                else e.target.pause();
            });
        }, { threshold: 0.25 });
        videos.forEach(function (v) { io.observe(v); });
    }

    // `section` is the carousel's .snap-section; its track, arrows and dots are
    // looked up inside it so several carousels can share the page.
    function initProjectCarousel(section, projects) {
        var track = section && section.querySelector('.project-list');
        if (!track) return;
        var prev = section.querySelector('.carousel-prev');
        var next = section.querySelector('.carousel-next');
        var dotsWrap = section.querySelector('.carousel-dots');

        if (!projects.length) {
            track.outerHTML = '<p class="project-empty">Coming soon.</p>';
            [prev && prev.parentNode, dotsWrap].forEach(function (el) { if (el) el.style.display = 'none'; });
            return;
        }
        track.innerHTML = projects.map(projectCardHTML).join('');

        var cards = Array.prototype.slice.call(track.children);
        initCardVideos(track);

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
            // Nothing to page through (e.g. a single project): hide arrows + dots
            var single = maxIndex() === 0;
            if (prev) prev.parentNode.hidden = single;
            if (dotsWrap) dotsWrap.hidden = single;
        }

        if (prev) prev.addEventListener('click', function () { go(current - 1); });
        if (next) next.addEventListener('click', function () { go(current + 1); });
        dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });

        // The fully-shown cards run from `current` to `current + visibleCount - 1`.
        // Clicking one of those follows its link; clicking a card that is only
        // peeking in on a side moves the carousel one step toward it instead.
        // Decided from index math (not live offsetLeft/scrollLeft geometry): the
        // track is position:static, so a card's offsetLeft is measured from a
        // page ancestor, not the track, and can't be compared to scrollLeft.
        track.addEventListener('click', function (e) {
            // Resolve to the card's own <li> via its anchor — closest('li') would
            // wrongly match the bullet <li> elements inside the card body.
            var card = e.target.closest('a.project');
            if (!card || card.parentNode.parentNode !== track) return;
            var ci = cards.indexOf(card.parentNode);
            if (ci < current || ci >= current + visibleCount()) {
                e.preventDefault();
                go(ci < current ? current - 1 : current + 1);
            }
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

    document.addEventListener('DOMContentLoaded', function () {
        initProjectCarousel(document.getElementById('handwritten'), HANDWRITTEN_PROJECTS);
        initProjectCarousel(document.getElementById('projects'), PROJECTS);

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

            // IntersectionObserver keeps the dots and header nav in sync with
            // the visible section
            var dots     = document.querySelectorAll('.dot');
            var navLinks = document.querySelectorAll('.nav a[data-section]');
            var sections = document.querySelectorAll('.snap-section');
            if (sections.length) {
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
                            navLinks.forEach(function (link) {
                                link.classList.toggle('active', link.dataset.section === id);
                            });
                        }
                    });
                }, { root: null, threshold: 0.5 });
                sections.forEach(function (s) { io.observe(s); });
            }

            // Scroll-reveal: fade section content up as it enters the viewport,
            // staggered by its position within the section. The .reveal class is
            // only added here so content is never hidden if JS doesn't run.
            var revealEls = document.querySelectorAll('.section-inner > *:not(.site-footer)');
            var ro = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        ro.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15 });
            revealEls.forEach(function (el) {
                var i = Array.prototype.indexOf.call(el.parentNode.children, el);
                el.style.transitionDelay = Math.min(i, 4) * 90 + 'ms';
                el.classList.add('reveal');
                ro.observe(el);
            });
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

// ─── Terminal for nerds ─────────────────────────────────────────────────────
// Terminal overlay opened from the header button. Runs a small virtual shell
// (ls, cd, cat, tree, open, …) over an in-memory file system that mirrors the
// content of the site.
(function () {

    // ── Virtual file system ────────────────────────────────────────────────
    // A plain object is a directory; a string is a file's contents. The user's
    // home is /home/ryan. URLs printed by `cat` are rendered as real links.
    var FS = {
        home: {
            ryan: {
                'about.txt':
                    "Hi, I'm Ryan Lewandowski — a software engineering student at\n" +
                    'Southern New Hampshire University who learns best by building\n' +
                    'projects that are just a little too ambitious for my current\n' +
                    'skill level, then figuring them out one problem at a time.\n' +
                    '\n' +
                    'Programming keeps me hooked because there is always a new\n' +
                    'problem to solve, a better way to build something, and, every\n' +
                    'once in a while, the computer actually does what I asked it\n' +
                    'to do.\n' +
                    '\n' +
                    'Currently learning: software architecture, system design.\n' +
                    "Status: open to opportunities. (Run 'status' to see what\n" +
                    "I'm up to right now.)",
                'contact.txt':
                    'email     ryanlewan.2@gmail.com\n' +
                    'github    https://github.com/ryanlew02\n' +
                    'linkedin  https://www.linkedin.com/in/ryan-lewandowski-120546164/\n' +
                    'leetcode  https://leetcode.com/u/ryanlew02/',
                'resume.pdf':
                    "cat: resume.pdf is a binary file — run 'open resume.pdf' to view it.",
                skills: {
                    'languages.txt':
                        'Python\nJavaScript / TypeScript\nJava\nSQL\nC++\nHTML / CSS',
                    'frameworks.txt':
                        'React\nReact Native\nExpo\nVite\nZustand\nDiscord.py',
                    'tools.txt':
                        'Git & GitHub\nAPIs & REST\nSQLite\nRiot Games API\nCSS custom properties\nPWA / service workers',
                },
                projects: {
                    'diverge-os': {
                        'README.md':
                            '# DivergeOS\n' +
                            '\n' +
                            'A fully functional desktop OS simulation that runs in the\n' +
                            'browser, themed around the Divergent universe. Complete with\n' +
                            'a real window manager, 12 working apps, faction-based themes,\n' +
                            'and a virtual file system (they seem to follow me around).\n' +
                            '\n' +
                            '- Window manager: drag, resize, minimize, maximize, z-stacking\n' +
                            '- Chess engine with minimax AI, alpha-beta pruning, 3 difficulties\n' +
                            '- 6 faction themes powered by CSS custom properties at runtime\n' +
                            '- Ships as a PWA — installable and fully offline-capable',
                        'tech-stack.txt':
                            'React\nTypeScript\nVite\nZustand\nCSS Modules',
                        'links.txt':
                            'live demo  https://ryanlew02.github.io/DivergeOS/\n' +
                            'source     https://github.com/ryanlew02/DivergeOS\n' +
                            'write-up   https://ryanlewan.com/divergeos/',
                    },
                    halflight: {
                        'README.md':
                            '# HalfLight\n' +
                            '\n' +
                            'Remember your dreams. Learn to wake inside them. An\n' +
                            'AI-assisted dream journal and lucid-dreaming guide for iOS,\n' +
                            'currently in development.\n' +
                            '\n' +
                            '- Offline-first sync: tombstones + last-write-wins merge\n' +
                            '- Feed ranked on smoothed like-per-view conversion, not recency\n' +
                            '- On-device semantic search via Apple sentence embeddings\n' +
                            '- AI runs server-side only: JWT + entitlement + atomic daily credits\n' +
                            '- Apple receipt JWS verified against a pinned root, in Deno\n' +
                            '- Every table under row-level security; abuse caps live in triggers',
                        'tech-stack.txt':
                            'SwiftUI\nSwiftData\nSwift Concurrency\nSupabase\n' +
                            'Postgres (RLS)\nDeno Edge Functions\nClaude API\n' +
                            'StoreKit 2\nAPNs\nWidgetKit',
                        'links.txt':
                            'site      https://halflightdream.com\n' +
                            'write-up  https://ryanlewan.com/halflight/',
                    },
                    'lol-discord-bot': {
                        'README.md':
                            '# League of Legends Discord Bot\n' +
                            '\n' +
                            "A Discord bot that pulls live match data from Riot Games'\n" +
                            'API, parses player performance, and delivers a humorous\n' +
                            'verdict directly to the server.\n' +
                            '\n' +
                            '- Integrates with the Riot Games API for real-time match history\n' +
                            '- Analyzes KDA, damage output, vision score, and objectives\n' +
                            '- Generates and posts performance verdicts to Discord channels',
                        'tech-stack.txt':
                            'Python\nRiot Games API\nDiscord.py',
                        'links.txt':
                            'source  https://github.com/ryanlew02/lol-inted-bot',
                    },
                    'this-website': {
                        'README.md':
                            '# This Portfolio\n' +
                            '\n' +
                            'The site you are on right now — this terminal included.\n' +
                            'Built from scratch with zero dependencies: no frameworks,\n' +
                            'no libraries. Pure HTML, CSS, and vanilla JavaScript.\n' +
                            '\n' +
                            '- Fully responsive layout with CSS Grid and fluid clamp() type\n' +
                            '- Dark / light themes via CSS custom properties + localStorage\n' +
                            '- Ambient animations with the Web Animations API\n' +
                            '- This shell: an in-memory file system, tab completion, and\n' +
                            '  a live status command backed by a Cloudflare Worker',
                        'tech-stack.txt':
                            'HTML\nCSS\nJavaScript (vanilla)\nCloudflare Workers',
                        'links.txt':
                            'live    https://ryanlewan.com\n' +
                            'source  https://github.com/ryanlew02/my_website',
                    },
                    'inner-city': {
                        'README.md':
                            '# Inner City\n' +
                            '\n' +
                            'Build your city, one habit at a time. A mobile habit-tracking\n' +
                            'app that gamifies your daily routines: complete habits to\n' +
                            'construct buildings and watch your city grow on an isometric\n' +
                            'grid.\n' +
                            '\n' +
                            '- Live on the iOS App Store\n' +
                            '- Isometric city that expands in real time as habits complete\n' +
                            '- Stats dashboard with heatmaps and weekly/monthly/yearly views\n' +
                            '- Supports "build" and "quit" habits with streak tracking',
                        'tech-stack.txt':
                            'React Native\nExpo\nTypeScript\nSQLite',
                        'links.txt':
                            'app store  https://apps.apple.com/us/app/inner-city/id6759073471\n' +
                            'source     https://github.com/ryanlew02/inner-city\n' +
                            'write-up   https://ryanlewan.com/innercity/',
                    },
                },
                experience: {
                    'nord.txt':
                        'Nord\n' +
                        '----\n' +
                        'Data Entry · June 2026 – present\n' +
                        '\n' +
                        'Enter orders for parts, where attention to detail is the\n' +
                        'whole job — a mistyped part number becomes the wrong part\n' +
                        'on someone’s dock.',
                    'bemobile.txt':
                        'BeMobile (Verizon)\n' +
                        '------------------\n' +
                        'Sales · Feb 2024 – May 2026\n' +
                        '\n' +
                        '- Top 20% of sellers for 6 months in a row\n' +
                        '- Selected for the leadership development program\n' +
                        '- Where I learned to talk to people — see\n' +
                        '  ~/hobbies/books/reading-list.txt, entry #2',
                },
                education: {
                    'snhu.txt':
                        'Southern New Hampshire University\n' +
                        'B.S. Software Engineering — expected May 2028\n' +
                        'GPA: 4.0',
                    'uwlax.txt':
                        'University of Wisconsin–La Crosse\n' +
                        '2019–2023\n' +
                        'Coursework in business and computer science.',
                },
                hobbies: {
                    books: {
                        'reading-list.txt':
                            'Every book on this shelf rewired something: how I think,\n' +
                            'how I build, or what I chase.\n' +
                            '\n' +
                            ' 1. The Code of the Extraordinary Mind — Vishen Lakhiani\n' +
                            ' 2. Way of the Wolf — Jordan Belfort\n' +
                            ' 3. Zero to One — Peter Thiel\n' +
                            ' 4. The Pragmatic Programmer — David Thomas & Andrew Hunt\n' +
                            ' 5. The Soul of a New Machine — Tracy Kidder\n' +
                            ' 6. Code — Charles Petzold\n' +
                            ' 7. The 7 Habits of Highly Effective People — Stephen R. Covey\n' +
                            ' 8. The Courage to Be Disliked — Kishimi & Koga\n' +
                            ' 9. The Subtle Art of Not Giving a F*ck — Mark Manson\n' +
                            '10. Atomic Habits — James Clear\n' +
                            '11. The Psychology of Money — Morgan Housel\n' +
                            '12. Mastery — Robert Greene\n' +
                            '13. The Lean Startup — Eric Ries',
                    },
                    workout: {
                        'running.txt':
                            'Running — the other kind of debugging.\n' +
                            'When the code stops making sense, the problem usually\n' +
                            'works itself out by mile two.',
                    },
                },
            },
        },
    };

    var HOME = ['home', 'ryan'];

    // Files that `open` can launch in a new tab, keyed by absolute path
    var OPENABLE = {
        '/home/ryan/resume.pdf': 'assets/resume.pdf',
    };

    // The "View Résumé" link carries the ?v=<hash> that cache-bust.js stamps
    // in, so prefer its href — that way `open resume.pdf` busts the cache too
    // without this file needing its own copy of the hash.
    function openableUrl(path) {
        var url = OPENABLE[path];
        if (!url) return url;
        var link = document.querySelector('.resume-btn[href]');
        var href = link && link.getAttribute('href');
        return href && href.split('?')[0] === url ? href : url;
    }

    // Cloudflare Worker behind the `status` command — the phone pushes a
    // status string via iOS Shortcuts automations, this reads the latest.
    var STATUS_URL = 'https://ryan-status.ryanlewan.workers.dev/status';

    document.addEventListener('DOMContentLoaded', function () {
        var openBtn   = document.getElementById('terminalBtn');
        var overlay   = document.getElementById('terminalOverlay');
        var closeBtn  = document.getElementById('terminalClose');
        var body      = document.getElementById('terminalBody');
        var history   = document.getElementById('terminalHistory');
        var typed     = document.getElementById('terminalTyped');
        var input     = document.getElementById('terminalInput');
        var promptEl  = document.getElementById('terminalPrompt');

        if (!openBtn || !overlay) return;

        var cwd = HOME.slice();          // current directory as path segments
        var cmdHistory = [];             // entered commands, for ↑/↓ recall
        var histIndex = -1;              // -1 = live line (not browsing history)
        var histDraft = '';              // what was typed before browsing began

        // ── Path helpers ──────────────────────────────────────────────────
        function isDir(node)  { return node !== null && typeof node === 'object'; }
        function nodeAt(segs) {
            var node = FS;
            for (var i = 0; i < segs.length; i++) {
                if (!isDir(node) || !(segs[i] in node)) return undefined;
                node = node[segs[i]];
            }
            return node;
        }

        // "projects/../about.txt", "/home", "~/skills" → absolute segments,
        // or null when the path climbs above the root.
        function resolvePath(path) {
            var segs;
            if (path.charAt(0) === '/') segs = [];
            else if (path === '~' || path.slice(0, 2) === '~/') {
                segs = HOME.slice();
                path = path.slice(2);
            }
            else segs = cwd.slice();

            var parts = path.split('/');
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                if (p === '' || p === '.') continue;
                if (p === '..') {
                    if (!segs.length) return null;
                    segs.pop();
                } else segs.push(p);
            }
            return segs;
        }

        function displayPath(segs) {
            if (segs.length >= HOME.length &&
                segs.slice(0, HOME.length).join('/') === HOME.join('/')) {
                var rest = segs.slice(HOME.length).join('/');
                return '~' + (rest ? '/' + rest : '');
            }
            return '/' + segs.join('/');
        }

        function promptText() {
            return 'visitor@ryanlewan.com:' + displayPath(cwd) + '$';
        }

        // ── Output helpers ────────────────────────────────────────────────
        var URL_RE = /https?:\/\/[^\s]+/g;

        // Print a block of text; URLs become real (new tab) links
        function print(text, className) {
            var line = document.createElement('div');
            line.className = 'terminal-line' + (className ? ' ' + className : '');
            String(text).split(URL_RE).forEach(function (chunk, i) {
                if (i > 0) {
                    var url = text.match(URL_RE)[i - 1];
                    var a = document.createElement('a');
                    a.className = 'terminal-link';
                    a.href = url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = url;
                    line.appendChild(a);
                }
                line.appendChild(document.createTextNode(chunk));
            });
            history.appendChild(line);
        }

        // Print a directory listing where each entry is individually styled
        function printEntries(entries) {
            var line = document.createElement('div');
            line.className = 'terminal-line';
            entries.forEach(function (e, i) {
                if (i) line.appendChild(document.createTextNode('  '));
                var span = document.createElement('span');
                span.className = e.dir ? 'terminal-entry-dir' : '';
                span.textContent = e.dir ? e.name + '/' : e.name;
                line.appendChild(span);
            });
            history.appendChild(line);
        }

        // Print one grep hit: an optional file label, then the line with every
        // pattern match highlighted
        function printGrepLine(label, text, re) {
            var line = document.createElement('div');
            line.className = 'terminal-line';
            if (label) {
                var file = document.createElement('span');
                file.className = 'terminal-grep-file';
                file.textContent = label + ':';
                line.appendChild(file);
            }
            var last = 0, m;
            re.lastIndex = 0;
            while ((m = re.exec(text)) !== null) {
                line.appendChild(document.createTextNode(text.slice(last, m.index)));
                var mark = document.createElement('span');
                mark.className = 'terminal-grep-match';
                mark.textContent = m[0];
                line.appendChild(mark);
                last = m.index + m[0].length;
                if (m[0] === '') re.lastIndex++;   // zero-length match guard
            }
            line.appendChild(document.createTextNode(text.slice(last)));
            history.appendChild(line);
        }

        function echoCommand(raw) {
            var line = document.createElement('div');
            line.className = 'terminal-line';
            var prompt = document.createElement('span');
            prompt.className = 'terminal-prompt';
            prompt.textContent = promptText();
            line.appendChild(prompt);
            line.appendChild(document.createTextNode(raw));
            history.appendChild(line);
        }

        function sortedEntries(node) {
            return Object.keys(node).sort(function (a, b) {
                var da = isDir(node[a]), db = isDir(node[b]);
                if (da !== db) return da ? -1 : 1;   // directories first
                return a.localeCompare(b);
            }).map(function (name) {
                return { name: name, dir: isDir(node[name]) };
            });
        }

        // ── Status ────────────────────────────────────────────────────────
        // "as of 14m ago" — rough age of a status update timestamp.
        function sinceAgo(ts) {
            var mins = Math.floor((Date.now() - ts) / 60000);
            if (mins < 2) return 'just now';
            if (mins < 60) return 'as of ' + mins + 'm ago';
            if (mins < 48 * 60) return 'as of ' + Math.floor(mins / 60) + 'h ago';
            return 'as of ' + Math.floor(mins / 1440) + 'd ago';
        }

        // ── Commands ──────────────────────────────────────────────────────
        var COMMANDS = {
            help: function () {
                print(
                    'status                what Ryan is up to right now',
                    'terminal-featured'
                );
                print(
                    'ls [path]             list directory contents\n' +
                    'cd <path>             change directory\n' +
                    'cat <file>            print a file\n' +
                    'grep <pattern> <file> search inside files (flags: -i, -r)\n' +
                    'pwd                   print working directory\n' +
                    'tree [path]           directory tree\n' +
                    'open <file>           open a file in a new tab (try resume.pdf)\n' +
                    'whoami                who is typing\n' +
                    'clear                 clear the screen\n' +
                    'exit                  close the terminal\n' +
                    '\n' +
                    'Tab completes commands and paths; ↑/↓ browse history.\n' +
                    'Anything that writes (mkdir, touch, rm, …) is politely refused.'
                );
            },
            ls: function (args) {
                var segs = resolvePath(args[0] || '.');
                var node = segs && nodeAt(segs);
                if (node === undefined || segs === null) {
                    print('ls: ' + args[0] + ': No such file or directory', 'terminal-error');
                } else if (!isDir(node)) {
                    print(args[0]);
                } else {
                    var entries = sortedEntries(node);
                    if (entries.length) printEntries(entries)
                }
            },
            cd: function (args) {
                var target = args[0] || '~';
                var segs = resolvePath(target);
                var node = segs && nodeAt(segs);
                if (node === undefined || segs === null) {
                    print('cd: ' + target + ': No such file or directory', 'terminal-error');
                } else if (!isDir(node)) {
                    print('cd: ' + target + ': Not a directory', 'terminal-error');
                } else {
                    cwd = segs;
                    promptEl.textContent = promptText();
                }
            },
            cat: function (args) {
                if (!args.length) { print('usage: cat <file>', 'terminal-error'); return; }
                args.forEach(function (arg) {
                    var segs = resolvePath(arg);
                    var node = segs && nodeAt(segs);
                    if (node === undefined || segs === null) {
                        print('cat: ' + arg + ': No such file or directory', 'terminal-error');
                    } else if (isDir(node)) {
                        print('cat: ' + arg + ': Is a directory', 'terminal-error');
                    } else {
                        print(node);
                    }
                });
            },
            pwd: function () {
                print('/' + cwd.join('/'));
            },
            tree: function (args) {
                var segs = resolvePath(args[0] || '.');
                var node = segs && nodeAt(segs);
                if (node === undefined || segs === null) {
                    print('tree: ' + args[0] + ': No such file or directory', 'terminal-error');
                    return;
                }
                if (!isDir(node)) { print(args[0]); return; }
                var lines = [displayPath(segs)];
                (function walk(dir, prefix) {
                    var entries = sortedEntries(dir);
                    entries.forEach(function (e, i) {
                        var last = i === entries.length - 1;
                        lines.push(prefix + (last ? '└── ' : '├── ') + e.name + (e.dir ? '/' : ''));
                        if (e.dir) walk(dir[e.name], prefix + (last ? '    ' : '│   '));
                    });
                })(node, '');
                print(lines.join('\n'));
            },
            open: function (args) {
                if (!args.length) { print('usage: open <file>', 'terminal-error'); return; }
                var segs = resolvePath(args[0]);
                var node = segs && nodeAt(segs);
                if (node === undefined || segs === null) {
                    print('open: ' + args[0] + ': No such file or directory', 'terminal-error');
                    return;
                }
                var url = openableUrl('/' + segs.join('/'));
                if (url) {
                    print('Opening ' + segs[segs.length - 1] + '…');
                    window.open(url, '_blank', 'noopener');
                } else {
                    print("open: " + args[0] + ": nothing to open — try 'cat' instead", 'terminal-error');
                }
            },
            grep: function (args) {
                var opts = '';
                var rest = [];
                args.forEach(function (a) {
                    if (!rest.length && a.charAt(0) === '-' && a.length > 1) opts += a.slice(1);
                    else rest.push(a);
                });
                if (rest.length < 2) {
                    print('usage: grep [-i] [-r] <pattern> <file …>', 'terminal-error');
                    return;
                }
                var ignoreCase = opts.indexOf('i') !== -1;
                var recursive  = opts.indexOf('r') !== -1;
                var pattern = rest[0];
                var re;
                try { re = new RegExp(pattern, ignoreCase ? 'gi' : 'g'); }
                catch (e) {
                    // Not a valid regex — fall back to a literal substring match
                    re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                        ignoreCase ? 'gi' : 'g');
                }

                // Expand the path arguments into a flat list of files to scan
                var files = [];
                rest.slice(1).forEach(function (arg) {
                    var segs = resolvePath(arg);
                    var node = segs && nodeAt(segs);
                    if (node === undefined || segs === null) {
                        print('grep: ' + arg + ': No such file or directory', 'terminal-error');
                    } else if (!isDir(node)) {
                        files.push({ label: arg, text: node });
                    } else if (!recursive) {
                        print('grep: ' + arg + ': Is a directory (try grep -r)', 'terminal-error');
                    } else {
                        (function walk(dir, base) {
                            sortedEntries(dir).forEach(function (e) {
                                if (e.dir) walk(dir[e.name], base + '/' + e.name);
                                else files.push({ label: base + '/' + e.name, text: dir[e.name] });
                            });
                        })(node, displayPath(segs));
                    }
                });

                var showFile = recursive || files.length > 1;
                var found = false;
                files.forEach(function (f) {
                    f.text.split('\n').forEach(function (lineText) {
                        re.lastIndex = 0;
                        if (!re.test(lineText)) return;
                        found = true;
                        printGrepLine(showFile ? f.label : '', lineText, re);
                    });
                });
                if (!found && files.length) print('grep: no matches for "' + pattern + '"');
            },
            status: function () {
                print('Pinging Ryan’s phone…');
                fetch(STATUS_URL)
                    .then(function (res) {
                        if (res.status === 429) throw new Error('easy there — too many requests, try again in a minute');
                        if (!res.ok) throw new Error('status service returned HTTP ' + res.status);
                        return res.json();
                    })
                    .then(function (data) {
                        if (!data.status) { print('status: no word from Ryan’s phone yet.'); }
                        else { print('Ryan is ' + data.status + (data.since ? ' (' + sinceAgo(data.since) + ')' : '')); }
                        body.scrollTop = body.scrollHeight;
                    })
                    .catch(function (err) {
                        print('status: ' + err.message, 'terminal-error');
                        body.scrollTop = body.scrollHeight;
                    });
            },
            whoami: function () { print('visitor'); },
            clear: function () { history.innerHTML = ''; },
            exit: function () { closeTerminal(); },
            echo: function (args) { print(args.join(' ')); },
            sudo: function () {
                print('visitor is not in the sudoers file. This incident will be reported.', 'terminal-error');
            },
        };

        // Write commands exist only to be refused — the file system is
        // read-only for visitors.
        ['mkdir', 'touch', 'rm', 'rmdir', 'mv', 'cp', 'chmod', 'chown', 'nano', 'vim', 'vi']
            .forEach(function (cmd) {
                COMMANDS[cmd] = function () {
                    print(cmd + ': request denied — /home/ryan is read-only for visitors.', 'terminal-error');
                };
            });

        function run(raw) {
            var trimmed = raw.trim();
            echoCommand(raw);
            if (!trimmed) return;
            cmdHistory.push(raw);

            var parts = trimmed.split(/\s+/);
            var cmd = parts[0];
            // Output redirection would write to the FS, so it's refused too
            if (parts.indexOf('>') !== -1 || parts.indexOf('>>') !== -1) {
                print(cmd + ': request denied — /home/ryan is read-only for visitors.', 'terminal-error');
            }
            else if (COMMANDS[cmd]) COMMANDS[cmd](parts.slice(1));
            else print(cmd + ": command not found — try 'help'", 'terminal-error');
        }

        // ── Tab completion ────────────────────────────────────────────────
        // Completes the command name for the first word, paths after that.
        function complete() {
            var value = input.value;
            var tokens = value.split(/\s+/);
            var token = tokens[tokens.length - 1];
            var options, stem;

            if (tokens.length === 1) {
                options = Object.keys(COMMANDS);
                stem = token;
            } else {
                var slash = token.lastIndexOf('/');
                var dirPart = slash === -1 ? '.' : (token.slice(0, slash) || '/');
                stem = token.slice(slash + 1);
                var segs = resolvePath(dirPart);
                var node = segs && nodeAt(segs);
                if (!node || !isDir(node)) return;
                options = Object.keys(node).map(function (name) {
                    return isDir(node[name]) ? name + '/' : name;
                });
            }

            var matches = options.filter(function (o) { return o.indexOf(stem) === 0; });
            if (!matches.length) return;
            if (matches.length === 1) {
                var completed = matches[0] + (tokens.length === 1 ? ' ' : '');
                input.value = value.slice(0, value.length - stem.length) + completed;
            } else {
                echoCommand(value);
                print(matches.join('  '));
            }
            typed.textContent = input.value;
            body.scrollTop = body.scrollHeight;
        }

        // ── Window open / close ───────────────────────────────────────────
        // On phones the on-screen keyboard covers the lower half of the
        // layout viewport without resizing it, hiding the prompt line. Track
        // the visual viewport and size the overlay to just the visible area.
        function fitOverlay() {
            if (overlay.hidden || !window.visualViewport) return;
            overlay.style.top = window.visualViewport.offsetTop + 'px';
            overlay.style.height = window.visualViewport.height + 'px';
            body.scrollTop = body.scrollHeight;
        }
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', fitOverlay);
            window.visualViewport.addEventListener('scroll', fitOverlay);
        }

        function openTerminal() {
            overlay.hidden = false;
            document.body.classList.add('terminal-open');
            input.focus();
            fitOverlay();
        }

        function closeTerminal() {
            overlay.hidden = true;
            overlay.style.top = overlay.style.height = '';
            document.body.classList.remove('terminal-open');
            openBtn.focus();
        }

        openBtn.addEventListener('click', openTerminal);
        closeBtn.addEventListener('click', closeTerminal);

        // Clicking the dimmed backdrop closes; clicking inside refocuses input
        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) closeTerminal();
        });
        body.addEventListener('click', function (e) {
            if (e.target.tagName !== 'A') input.focus();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !overlay.hidden) closeTerminal();
        });

        // Mirror keystrokes into the visible line
        input.addEventListener('input', function () {
            typed.textContent = input.value;
            histIndex = -1;
            body.scrollTop = body.scrollHeight;
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                run(input.value);
                input.value = '';
                typed.textContent = '';
                histIndex = -1;
                body.scrollTop = body.scrollHeight;
            } else if (e.key === 'Tab') {
                e.preventDefault();
                complete();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!cmdHistory.length) return;
                if (histIndex === -1) { histDraft = input.value; histIndex = cmdHistory.length; }
                if (histIndex > 0) histIndex--;
                input.value = cmdHistory[histIndex];
                typed.textContent = input.value;
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (histIndex === -1) return;
                histIndex++;
                if (histIndex >= cmdHistory.length) {
                    histIndex = -1;
                    input.value = histDraft;
                } else {
                    input.value = cmdHistory[histIndex];
                }
                typed.textContent = input.value;
            }
        });
    });
})();
