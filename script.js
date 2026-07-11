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
                'Ships as a PWA, installable and fully offline-capable'
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
            desc: 'Built from scratch with zero dependencies: no frameworks, no libraries. Pure HTML, CSS, and vanilla JavaScript.',
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

    // ── Reading shelf data ─────────────────────────────────────────────────
    // The bookshelf starts empty. Add a book by appending an object here — it
    // renders as a spine that lifts off the shelf on hover and reveals its
    // "what I learned" card (all styling is already in place in style.css).
    // Only `title` and `learned` are required.
    var BOOKS = [
        // {
        //     title: 'The Pragmatic Programmer',
        //     author: 'David Thomas & Andrew Hunt',
        //     learned: 'A sentence or two on what this book taught me.',
        //                         // \n starts a new takeaway line; text before
        //                         // a | renders as its bolded main point
        //     color: '#5b3d8a',   // spine colour (defaults to a leather brown)
        //     height: 176,        // spine height in px — 150–190 looks best
        //     width: 44,          // spine width in px
        //     image: 'assets/books/slug.jpg', // spine artwork — a tall, narrow
        //                         // crop works best; it replaces the title text
        //     imagePos: '100% 50%', // which part of the artwork the spine shows
        //                         // (background-position; defaults to center)
        // },
        // Books flow onto extra shelf rows automatically when they outgrow
        // the screen (see initBookshelf), so just keep appending here.
        {
            title: 'The Code of the Extraordinary Mind',
            author: 'Vishen Lakhiani',
            learned: '1. Question the “brules” | the bullshit rules that society, family, school, and culture taught you to follow without ever questioning.\n2. Don’t chase goals that aren’t truly yours | a lot of burnout comes from chasing outcomes that sound impressive but don’t actually fulfill you.',
            color: '#e8e4dc',
            height: 176,
            width: 46,
            image: 'assets/books/code-extraordinary-mind.jpg',
        },
        {
            title: 'Way of the Wolf',
            author: 'Jordan Belfort',
            learned: '1. Sales is about certainty | a sale happens when the prospect feels certain about three things: the product, you, and the company behind it.\n2. Control the conversation | the Straight Line System is about keeping the conversation moving toward the close without letting it drift everywhere.',
            color: '#c8c8c8',
            height: 170,
            width: 44,
            image: 'assets/books/way-of-the-wolf.jpg',
        },
        {
            title: 'Zero to One',
            author: 'Peter Thiel',
            learned: '1. Build something new and original | real progress comes from creating something that doesn’t already exist, not just copying what already works.\n2. Start with a small market and dominate it | great companies usually don’t start by trying to serve everyone — and this one applies to personal life, not just business.',
            color: '#7d96b8',
            height: 174,
            width: 44,
            image: 'assets/books/zero-to-one.jpg',
        },
        {
            title: 'The Pragmatic Programmer',
            author: 'David Thomas & Andrew Hunt',
            learned: '1. Take responsibility for your code and your growth | good developers don’t just “write code” — they take ownership.\n2. Write code that is easy to change | software will always change: requirements change, users change, businesses change, and your understanding of the problem changes.',
            color: '#4a3b30',
            height: 178,
            width: 48,
            image: 'assets/books/pragmatic-programmer.jpg',
        },
        {
            title: 'The Soul of a New Machine',
            author: 'Tracy Kidder',
            learned: '1. Great work often comes from obsession, pressure, and pride | building something difficult takes more than technical skill — the engineers are driven by pride, competition, curiosity, and the need to prove themselves.\n2. Technology is built by humans, not just “geniuses” | major breakthroughs aren’t clean, perfect, or magical — they come from teams dealing with stress, tradeoffs, bad communication, deadlines, ego, and uncertainty.',
            color: '#c2338a',
            height: 172,
            width: 44,
            image: 'assets/books/soul-of-a-new-machine.jpg',
        },
        {
            title: 'Code',
            author: 'Charles Petzold',
            learned: '1. Computers are built from simple ideas layered together | computers seem magical, but they’re built from very simple concepts stacked on top of each other.\n2. Code is just a way to represent information | “code” isn’t only programming code — it’s any system for representing meaning.',
            color: '#1b2a4a',
            height: 168,
            width: 42,
            image: 'assets/books/code-petzold.jpg',
        },
        {
            title: 'The 7 Habits of Highly Effective People',
            author: 'Stephen R. Covey',
            learned: '1. Focus on what you can control | stop spending so much energy on things outside your control.\n2. Begin with the end in mind | live and work with a clear picture of who you want to become and what actually matters to you.',
            color: '#b03028',
            height: 174,
            width: 46,
            image: 'assets/books/seven-habits.jpg',
        },
        {
            title: 'The Courage to Be Disliked',
            author: 'Ichiro Kishimi & Fumitake Koga',
            learned: '1. Most problems are relationship problems | a lot of our stress comes from worrying about how other people see us.\n2. Separate your tasks from other people’s tasks | “task separation” — your task is what you can control: your actions, choices, effort, honesty, and direction.',
            color: '#d8d2c6',
            height: 170,
            width: 44,
            image: 'assets/books/courage-to-be-disliked.jpg',
        },
        {
            title: 'The Subtle Art of Not Giving a F*ck',
            author: 'Mark Manson',
            learned: '1. Choose what is actually worth caring about | if you care about every opinion, every failure, every insecurity, every comparison, and every small problem, you burn yourself out.\n2. Problems never disappear, they just improve | life isn’t about reaching a point where you have no problems — it’s about choosing better problems.',
            color: '#e35336',
            height: 172,
            width: 45,
            image: 'assets/books/subtle-art.jpg',
        },
        {
            title: 'Atomic Habits',
            author: 'James Clear',
            learned: '1. Small habits compound into big results | massive change usually comes from tiny improvements repeated consistently.\n2. Make habits satisfying and rewarding | your brain is more likely to repeat a habit when there’s an immediate reward — make good habits more enjoyable, satisfying, or fun.',
            color: '#eae4da',
            height: 175,
            width: 47,
            image: 'assets/books/atomic-habits.jpg',
        },
        {
            title: 'The Psychology of Money',
            author: 'Morgan Housel',
            learned: '1. Wealth is built by behavior, not just intelligence | your behavior matters more: patience, consistency, avoiding ego, controlling spending, and not making emotional decisions.\n2. Freedom is the real goal of money | money’s greatest value isn’t buying expensive things — it’s buying control over your time.',
            color: '#b7c2b2',
            height: 172,
            width: 45,
            image: 'assets/books/psychology-of-money.jpg',
        },
        {
            title: 'Mastery',
            author: 'Robert Greene',
            learned: '1. Mastery comes from patient apprenticeship | most people want shortcuts, but real mastery comes from going through the beginner stage, studying the fundamentals, finding mentors, and slowly building skill over time.\n2. Find the work that naturally pulls you in | Greene calls this your “Life’s Task” — the work that feels meaningful enough to keep improving at even when it gets hard.',
            color: '#20201e',
            height: 176,
            width: 46,
            image: 'assets/books/mastery.jpg',
            imagePos: '100% 50%',
        },
        {
            title: 'The Lean Startup',
            author: 'Eric Ries',
            learned: '1. Use the Build–Measure–Learn loop | instead of spending months perfecting an idea, create a basic version, release it, measure how real customers respond, and use what you learn to improve it.\n2. Focus on validated learning, not just growth or activity | progress isn’t measured by how much you build or how busy you are — it’s measured by whether you’re learning what customers actually want and proving your assumptions are correct.',
            color: '#1e88c7',
            height: 173,
            width: 45,
            image: 'assets/books/lean-startup.jpg',
        },
    ];

    // Each \n-separated line is a takeaway; "main point | detail" renders the
    // main point bold with the detail flowing after a dash.
    function learnedHTML(text) {
        return String(text).split('\n').map(function (line) {
            var i = line.indexOf('|');
            if (i === -1) return escapeHTML(line.trim());
            return '<strong class="book-info-point">' + escapeHTML(line.slice(0, i).trim()) + '</strong> — ' +
                escapeHTML(line.slice(i + 1).trim());
        }).join('\n');
    }

    function bookHTML(b, cardDx) {
        var style = '';
        if (b.color)  style += '--book-color:' + b.color + ';';
        if (b.height) style += '--book-h:' + b.height + 'px;';
        if (b.width)  style += '--book-w:' + b.width + 'px;';
        if (b.image)  style += '--book-image:url(&quot;' + b.image + '&quot;);';
        if (b.imagePos) style += '--book-image-pos:' + b.imagePos + ';';
        if (cardDx)   style += '--card-dx:' + cardDx + 'px;';
        var author = b.author
            ? '<span class="book-info-author">' + escapeHTML(b.author) + '</span>'
            : '';
        return '' +
            '<button class="book' + (b.image ? ' book--art' : '') + '" type="button"' + (style ? ' style="' + style + '"' : '') + '>' +
                '<span class="book-spine-title">' + escapeHTML(b.title) + '</span>' +
                '<span class="book-info" role="tooltip">' +
                    '<strong class="book-info-title">' + escapeHTML(b.title) + '</strong>' +
                    author +
                    '<span class="book-info-label">What I learned</span>' +
                    '<span class="book-info-text">' + learnedHTML(b.learned) + '</span>' +
                '</span>' +
            '</button>';
    }

    function initBookshelf() {
        var caseEl = document.getElementById('bookshelf');
        // While BOOKS is empty, leave the "arriving soon" hint from the HTML
        if (!caseEl || !BOOKS.length) return;

        var lastSig = '';

        // Split BOOKS into as many shelf rows as the available width demands
        // (one wide row on desktop, two or more on a phone) and render each
        // row as its own .shelf so every row of spines gets a board under it.
        function layout() {
            var probe = caseEl.querySelector('.shelf-books');
            if (!probe) return;

            var rowCS  = getComputedStyle(probe);
            var caseCS = getComputedStyle(caseEl);
            var gap    = parseFloat(rowCS.columnGap) || 7;
            var scale  = parseFloat(caseCS.getPropertyValue('--book-scale')) || 1;

            // Width a row of spines may occupy: the section's inner width minus
            // everything the bookcase itself adds around the row.
            var parent   = caseEl.parentElement;
            var parentCS = getComputedStyle(parent);
            var avail = parent.clientWidth -
                (parseFloat(parentCS.paddingLeft) || 0) - (parseFloat(parentCS.paddingRight) || 0) -
                (parseFloat(caseCS.paddingLeft) || 0) - (parseFloat(caseCS.paddingRight) || 0) -
                (parseFloat(caseCS.borderLeftWidth) || 0) - (parseFloat(caseCS.borderRightWidth) || 0) -
                (parseFloat(rowCS.paddingLeft) || 0) - (parseFloat(rowCS.paddingRight) || 0);

            var rows = [[]];
            var x = 0;
            BOOKS.forEach(function (b) {
                var row = rows[rows.length - 1];
                var w = (b.width || 42) * scale;
                var next = x + (row.length ? gap : 0) + w;
                if (row.length && next > avail) {
                    rows.push([{ book: b, x: 0, w: w }]);
                    x = w;
                } else {
                    row.push({ book: b, x: x + (row.length ? gap : 0), w: w });
                    x = next;
                }
            });

            // Re-render only when the flow actually changes.
            var sig = scale + ':' + rows.map(function (r) { return r.length; }).join(',');
            if (sig === lastSig) return;
            lastSig = sig;

            var cardW = Math.min(320, window.innerWidth * 0.74); // .book-info width
            caseEl.innerHTML = rows.map(function (r) {
                var rowW = r[r.length - 1].x + r[r.length - 1].w;
                return '<div class="shelf"><div class="shelf-books">' +
                    r.map(function (item) {
                        // Nudge a book's info card inward when its default
                        // spot (14px left of the spine) would clip the row.
                        var cardLeft = item.x - 14;
                        var target = rowW <= cardW
                            ? (rowW - cardW) / 2
                            : Math.max(0, Math.min(cardLeft, rowW - cardW));
                        var dx = Math.round(target - cardLeft);
                        return bookHTML(item.book, dx);
                    }).join('') +
                    '</div><div class="shelf-board"></div></div>';
            }).join('');
        }

        layout();
        var settle;
        window.addEventListener('resize', function () {
            window.clearTimeout(settle);
            settle = window.setTimeout(layout, 120);
        });
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
            btn.setAttribute('aria-label', `Switch theme (current: ${LABELS[theme]})`);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(getTheme());
        initProjectCarousel();
        initBookshelf();

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

        // ── "Currently working on" notification ────────────────────────────────
        var workToast = document.getElementById('workToast');
        var workToastClose = document.getElementById('workToastClose');

        function dismissWorkToast() {
            if (!workToast || workToast.classList.contains('leaving')) return;
            workToast.classList.add('leaving');
            // Remove from the page once the fade-out finishes
            setTimeout(function () { workToast.classList.add('dismissed'); }, 300);
        }

        if (workToastClose) {
            workToastClose.addEventListener('click', function (e) {
                e.preventDefault();
                dismissWorkToast();
            });
        }

        // Auto-dismiss: 1.1s fly-in (600ms delay + 500ms animation), then the
        // 3s countdown shown by the .work-toast-progress bar.
        if (workToast) setTimeout(dismissWorkToast, 1100 + 3000);
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
