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

        // ── Scroll-snap navigation ────────────────────────────────────────────
        var scrollContainer = document.getElementById('scroll-container');
        if (scrollContainer) {
            scrollContainer.scrollTop = 0;
            // Anchor links scroll the container, not the document
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
                }, { root: scrollContainer, threshold: 0.5 });
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

// ─── Harry Potter Animations ───────────────────────────────────────────────
(function () {

    // ── Smoke cloud helper (used by Hallows Easter egg) ─────────────────────
    function spawnSmoke(x, y) {
        var el = document.createElement('div');
        var size = 20 + Math.random() * 28;
        var w = size * (1 + Math.random() * 1.2);
        var h = size;
        var rot = Math.random() * 360;

        el.style.cssText =
            'position:fixed;pointer-events:none;z-index:9998;border-radius:50%;' +
            'left:' + (x - w / 2) + 'px;top:' + (y - h / 2) + 'px;' +
            'width:' + w + 'px;height:' + h + 'px;' +
            'background:radial-gradient(ellipse at center,' +
            'rgba(70,30,120,0.5) 0%,rgba(20,5,50,0.18) 55%,transparent 100%);' +
            'filter:blur(' + (4 + Math.random() * 5) + 'px);' +
            'transform:rotate(' + rot + 'deg);will-change:transform,opacity;';
        document.body.appendChild(el);

        var dx = (Math.random() - 0.5) * 36;
        var dy = -(18 + Math.random() * 28);

        el.animate([
            { transform: 'rotate(' + rot + 'deg) translate(0,0) scale(1)', opacity: 1 },
            { transform: 'rotate(' + (rot + 30) + 'deg) translate(' + dx + 'px,' + dy + 'px) scale(1.9)', opacity: 0 }
        ], { duration: 750 + Math.random() * 500, easing: 'ease-out', fill: 'forwards' })
            .onfinish = function () { el.remove(); };
    }

    // ── Page intro: Death Eater apparition ───────────────────────────────────
    function runSmokeIntro() {
        var overlay = document.getElementById('smoke-intro');
        if (!overlay) return;

        var W = window.innerWidth;
        var H = window.innerHeight;

        // Eight overlapping smoke masses that churn, then fly apart
        var configs = [
            { x: 0.50, y: 0.50, w: 0.72, h: 0.66, rgb: '15,5,40',  dur: 2700, delay:   0 },
            { x: 0.28, y: 0.38, w: 0.56, h: 0.50, rgb: '22,8,54',  dur: 2500, delay: 110 },
            { x: 0.72, y: 0.58, w: 0.60, h: 0.54, rgb: '10,3,30',  dur: 2650, delay:  75 },
            { x: 0.50, y: 0.26, w: 0.52, h: 0.46, rgb: '18,6,46',  dur: 2400, delay: 190 },
            { x: 0.50, y: 0.74, w: 0.54, h: 0.48, rgb: '12,4,36',  dur: 2600, delay: 155 },
            { x: 0.13, y: 0.50, w: 0.46, h: 0.42, rgb: '8,2,26',   dur: 2300, delay: 240 },
            { x: 0.87, y: 0.44, w: 0.48, h: 0.44, rgb: '16,5,44',  dur: 2550, delay: 175 },
            { x: 0.64, y: 0.17, w: 0.42, h: 0.38, rgb: '12,4,36',  dur: 2200, delay: 310 },
        ];

        configs.forEach(function (c) {
            var el = document.createElement('div');
            var w = c.w * W, h = c.h * H;
            // Each wisp flies off in a random direction
            var angle = Math.random() * Math.PI * 2;
            var speed = 0.55 + Math.random() * 0.55;
            var dx = Math.cos(angle) * W * speed;
            var dy = Math.sin(angle) * H * speed;
            var r0 = (Math.random() - 0.5) * 50;
            var r1 = r0 + (Math.random() - 0.5) * 100;

            el.style.cssText =
                'position:absolute;border-radius:50%;pointer-events:none;' +
                'left:' + (c.x * W - w / 2) + 'px;top:' + (c.y * H - h / 2) + 'px;' +
                'width:' + w + 'px;height:' + h + 'px;' +
                'background:radial-gradient(ellipse at 44% 44%,' +
                'rgba(' + c.rgb + ',0.97) 0%,rgba(' + c.rgb + ',0.55) 48%,transparent 76%);' +
                'filter:blur(40px);will-change:transform,opacity;';
            overlay.appendChild(el);

            el.animate([
                { opacity: 0,    transform: 'scale(0.22) rotate(' + r0 + 'deg)' },
                { opacity: 0.98, transform: 'scale(1)    rotate(' + r0 + 'deg)',
                  offset: 0.18 },
                { opacity: 0.90, transform: 'scale(1.1) rotate(' + (r0 * 0.4) + 'deg)' +
                  ' translate(' + dx * 0.04 + 'px,' + dy * 0.04 + 'px)',
                  offset: 0.52 },
                { opacity: 0,    transform: 'scale(2.8)  rotate(' + r1 + 'deg)' +
                  ' translate(' + dx + 'px,' + dy + 'px)' }
            ], {
                duration: c.dur, delay: c.delay,
                easing: 'cubic-bezier(0.4,0,0.6,1)', fill: 'forwards'
            });
        });

        // Fade the solid base out after the wisps have built up
        overlay.animate([
            { opacity: 1 },
            { opacity: 1, offset: 0.44 },
            { opacity: 0 }
        ], { duration: 3200, easing: 'ease-in', fill: 'forwards' })
            .onfinish = function () { overlay.remove(); };

        // Click anywhere to skip
        overlay.addEventListener('click', function () {
            overlay.style.cssText += 'transition:opacity 0.3s ease;opacity:0;pointer-events:none;';
            setTimeout(function () { overlay.remove(); }, 320);
        }, { once: true });
    }

    runSmokeIntro();

    // ── Spell Spark Burst ────────────────────────────────────────────────────
    var SPARK_COLORS = ['#4cd97a', '#7aff9e', '#2ecc71', '#a8e63d', '#ccffdd', '#20e87a'];

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
                spawnSparks(r.left + r.width / 2, r.top + r.height / 2, 12);
            });
        });

        document.querySelectorAll('.project').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                var r = el.getBoundingClientRect();
                spawnSparks(r.right - 22, r.top + 22, 9);
            });
        });

        document.querySelectorAll('.nav a').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                var r = el.getBoundingClientRect();
                spawnSparks(r.left + r.width / 2, r.bottom + 2, 6);
            });
        });

        document.querySelectorAll('.github-link').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                var r = el.getBoundingClientRect();
                spawnSparks(r.left + r.width / 2, r.top + r.height / 2, 10);
            });
        });

        document.querySelectorAll('.logo, .theme-toggle').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                var r = el.getBoundingClientRect();
                spawnSparks(r.left + r.width / 2, r.top + r.height / 2, 7);
            });
        });

        document.querySelectorAll('.links a, .copy-email').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                var r = el.getBoundingClientRect();
                spawnSparks(r.left + r.width / 2, r.top + r.height / 2, 6);
            });
        });

        // Deathly Hallows Easter egg — Master of Death sequence
        var hallows = document.querySelector('.hp-hallows');
        if (hallows) {
            hallows.addEventListener('click', masterOfDeathSequence);
        }
    });

    // ── Master of Death sequence ─────────────────────────────────────────────
    function masterOfDeathSequence() {
        if (document.getElementById('mod-overlay')) return;

        // Quick spark burst as click feedback
        var hr = document.querySelector('.hp-hallows').getBoundingClientRect();
        var hcx = hr.left + hr.width / 2, hcy = hr.top + hr.height / 2;
        spawnSparks(hcx, hcy, 18);

        // ── Build overlay ────────────────────────────────────────────────
        var ov = document.createElement('div');
        ov.id = 'mod-overlay';
        ov.style.cssText =
            'position:fixed;inset:0;z-index:9000;' +
            'display:flex;align-items:center;justify-content:center;' +
            'cursor:pointer;opacity:0;transition:opacity 0.8s ease;';

        ov.innerHTML =
            '<div style="position:absolute;inset:0;background:rgba(2,3,12,0.93);"></div>' +
            '<div style="position:relative;z-index:1;display:flex;flex-direction:column;' +
                'align-items:center;gap:44px;padding:48px;">' +

                '<svg width="240" height="264" viewBox="0 0 100 110" fill="none" overflow="visible" style="overflow:visible;">' +
                    '<polygon id="mod-cloak" points="50,14 4,96 96,96"' +
                        ' stroke="rgba(120,95,40,0.2)" stroke-width="1.5" stroke-linejoin="round"/>' +
                    '<circle id="mod-stone" cx="50" cy="69" r="27"' +
                        ' stroke="rgba(120,95,40,0.2)" stroke-width="1.5"/>' +
                    '<line id="mod-wand" x1="50" y1="14" x2="50" y2="96"' +
                        ' stroke="rgba(120,95,40,0.2)" stroke-width="1.5"/>' +
                '</svg>' +

                '<div id="mod-text" style="' +
                    'font-family:Cinzel,Georgia,serif;text-align:center;' +
                    'min-height:64px;display:flex;flex-direction:column;' +
                    'align-items:center;gap:10px;opacity:0;transition:opacity 0.45s ease;">' +
                    '<div id="mod-name" style="font-size:clamp(13px,1.7vw,19px);font-weight:600;' +
                        'letter-spacing:0.14em;text-transform:uppercase;color:#c9a84c;"></div>' +
                    '<div id="mod-desc" style="font-size:clamp(11px,1.1vw,13px);' +
                        'letter-spacing:0.07em;color:rgba(201,168,76,0.55);' +
                        'font-style:italic;font-weight:400;"></div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(ov);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { ov.style.opacity = '1'; });
        });

        var elWand  = document.getElementById('mod-wand');
        var elStone = document.getElementById('mod-stone');
        var elCloak = document.getElementById('mod-cloak');
        var elText  = document.getElementById('mod-text');
        var elName  = document.getElementById('mod-name');
        var elDesc  = document.getElementById('mod-desc');

        // ── Helpers ──────────────────────────────────────────────────────
        function lightEl(el, delay) {
            setTimeout(function () {
                el.animate([
                    { stroke: 'rgba(120,95,40,0.2)' },
                    { stroke: '#ffd060',
                      filter: 'drop-shadow(0 0 5px #ffd060) drop-shadow(0 0 14px #c9a84c)' },
                    { stroke: '#c9a84c',
                      filter: 'drop-shadow(0 0 7px #c9a84c)' }
                ], { duration: 900, easing: 'ease-out', fill: 'forwards' });
            }, delay);
        }

        function showSubtitle(name, desc, delay) {
            setTimeout(function () {
                elText.style.opacity = '0';
                setTimeout(function () {
                    elName.style.fontSize     = '';
                    elName.style.letterSpacing = '';
                    elName.style.textShadow   = '';
                    elName.textContent = name;
                    elDesc.textContent = desc;
                    elText.style.opacity = '1';
                }, 300);
            }, delay);
        }

        // ── Sequence ─────────────────────────────────────────────────────
        lightEl(elWand,  700);
        showSubtitle('The Elder Wand',
                     'The most powerful wand ever made',  700);

        lightEl(elStone, 1900);
        showSubtitle('The Resurrection Stone',
                     'Recalls the souls of the dead',     1900);

        lightEl(elCloak, 3100);
        showSubtitle('The Cloak of Invisibility',
                     'Renders the wearer invisible to Death', 3100);

        // ── Master of Death ───────────────────────────────────────────────
        setTimeout(function () {
            elText.style.opacity = '0';

            // All three pulse bright white-gold together
            [elWand, elStone, elCloak].forEach(function (el) {
                el.animate([
                    {},
                    { stroke: '#fffbe8',
                      filter: 'drop-shadow(0 0 18px #ffd060) drop-shadow(0 0 45px #c9a84c)' },
                    { stroke: '#c9a84c',
                      filter: 'drop-shadow(0 0 9px #c9a84c)' }
                ], { duration: 1400, easing: 'ease-in-out', fill: 'forwards' });
            });

            // Letter-by-letter reveal
            setTimeout(function () {
                elDesc.textContent = '';
                elName.style.fontSize      = 'clamp(20px,2.8vw,34px)';
                elName.style.letterSpacing = '0.22em';
                elName.style.textShadow    =
                    '0 0 24px rgba(201,168,76,0.9),0 0 60px rgba(201,168,76,0.45)';

                var phrase = 'Master of Death';
                elName.innerHTML = phrase.split('').map(function (ch) {
                    return '<span style="display:inline-block;opacity:0">' +
                           (ch === ' ' ? '\u00a0' : ch) + '</span>';
                }).join('');

                elName.querySelectorAll('span').forEach(function (span, i) {
                    span.animate(
                        [{ opacity: 0, transform: 'translateY(10px)' },
                         { opacity: 1, transform: 'translateY(0)' }],
                        { duration: 380, delay: i * 55,
                          easing: 'ease-out', fill: 'forwards' }
                    );
                });

                elText.style.opacity = '1';

                // Burst of sparks around the symbol once title is fully revealed
                setTimeout(function () {
                    var r2 = ov.getBoundingClientRect();
                    var cx2 = r2.width / 2, cy2 = r2.height / 2;
                    spawnSparks(cx2, cy2 - 80, 28);
                }, phrase.length * 55 + 200);

            }, 550);

        }, 4300);

        // ── Auto-dismiss after 7.5 s ──────────────────────────────────────
        var autoDismiss = setTimeout(dismiss, 7500);

        ov.addEventListener('click', function () {
            clearTimeout(autoDismiss);
            dismiss();
        }, { once: true });

        function dismiss() {
            ov.style.opacity = '0';
            setTimeout(function () { if (ov.parentNode) ov.remove(); }, 850);
        }
    }

    // ── Ambient Floating Embers ──────────────────────────────────────────────
    function spawnEmber() {
        var el = document.createElement('div');
        var size = 1.5 + Math.random() * 2;
        var x = Math.random() * window.innerWidth;

        el.style.cssText =
            'position:fixed;pointer-events:none;z-index:1;border-radius:50%;' +
            'left:' + x + 'px;bottom:-8px;' +
            'width:' + size + 'px;height:' + size + 'px;' +
            'background:#4cd97a;' +
            'box-shadow:0 0 ' + (size * 3) + 'px #4cd97a;';
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

    setInterval(spawnEmber, 550);
    for (var i = 0; i < 6; i++) setTimeout(spawnEmber, Math.random() * 2500);

})();

// ── Patronus Charm ────────────────────────────────────────────────────────────
(function () {

    var SPELL = 'expecto';
    var typed = '';

    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key.length !== 1) return;
        typed += e.key.toLowerCase();
        if (typed.length > SPELL.length) typed = typed.slice(-SPELL.length);
        if (typed === SPELL) { typed = ''; castPatronus(); }
    });

    function castPatronus() {
        if (document.getElementById('patronus-stag')) return;

        var W     = window.innerWidth;
        var H     = window.innerHeight;
        var deerH = Math.min(250, H * 0.42);
        var deerW = deerH * (200 / 150);

        // Three bounding arcs, each higher than the last.
        // Each arc: {x0,y0} → {x1,y1} with upward bow h, ending at global t = tEnd.
        // Single continuous path: rising diagonal + three Gaussian humps.
        // No segment boundaries, no hidden transitions — one smooth organic curve.
        var P0x = -deerW * 0.15, P0y = H * 0.78;
        var P1x =  W + deerW * 0.15, P1y = H * 0.06;
        var HUMPS = [
            {c: 0.17, w: 0.090, a: H * 0.12},
            {c: 0.50, w: 0.110, a: H * 0.16},
            {c: 0.82, w: 0.130, a: H * 0.21},
        ];

        // ── Screen flash
        var flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;z-index:190;pointer-events:none;background:rgba(140,190,255,0.16);';
        document.body.appendChild(flash);
        flash.animate([{opacity:0},{opacity:1},{opacity:0}], {duration:650,easing:'ease-out',fill:'forwards'})
            .onfinish = function () { flash.remove(); };

        // ── Spell text
        var spellEl = document.createElement('div');
        spellEl.textContent = 'Expecto Patronum';
        spellEl.style.cssText =
            'position:fixed;z-index:200;pointer-events:none;left:50%;bottom:20%;' +
            'transform:translateX(-50%);font-family:Cinzel,Georgia,serif;' +
            'font-size:clamp(14px,2.6vw,26px);font-style:italic;letter-spacing:0.22em;' +
            'font-weight:400;color:#d0eeff;' +
            'text-shadow:0 0 18px #6ab4ff,0 0 48px rgba(80,140,255,0.7);' +
            'white-space:nowrap;opacity:0;';
        document.body.appendChild(spellEl);
        setTimeout(function () {
            spellEl.animate([
                {opacity:0, transform:'translateX(-50%) translateY(8px)'},
                {opacity:1, transform:'translateX(-50%) translateY(0)',  offset:0.18},
                {opacity:1, transform:'translateX(-50%) translateY(0)',  offset:0.68},
                {opacity:0, transform:'translateX(-50%) translateY(-8px)'}
            ], {duration:2800, easing:'ease-in-out', fill:'forwards'})
                .onfinish = function () { spellEl.remove(); };
        }, 280);

        // ── Stag element — left:0 top:0, position driven entirely by transform
        var stag = document.createElement('div');
        stag.id  = 'patronus-stag';
        stag.style.cssText =
            'position:fixed;pointer-events:none;z-index:195;' +
            'left:0;top:0;' +
            'width:' + deerW + 'px;height:' + deerH + 'px;' +
            'will-change:transform,opacity;' +
            'filter:drop-shadow(0 0 12px #a8d4ff) ' +
                    'drop-shadow(0 0 34px #6ab4ff) ' +
                    'drop-shadow(0 0 72px rgba(90,150,255,0.62));';
        stag.innerHTML = getStagSVG();
        document.body.appendChild(stag);

        var rootG = stag.querySelector('#p-root');
        // Far-side legs drawn first (behind body), near-side on top.
        // ang/vel track the spring-physics state for each leg.
        var LEGS = [
            {el: stag.querySelector('#p-h2'), ax:72,  ay:110, len:44, hind:true,  near:false, ang:-0.14, vel:0},
            {el: stag.querySelector('#p-f2'), ax:132, ay:106, len:47, hind:false, near:false, ang: 0.10, vel:0, splay:-0.10},
            {el: stag.querySelector('#p-h1'), ax:62,  ay:107, len:47, hind:true,  near:true,  ang:-0.14, vel:0},
            {el: stag.querySelector('#p-f1'), ax:120, ay:108, len:46, hind:false, near:true,  ang: 0.10, vel:0, splay: 0.10},
        ];

        var _jid = 0;
        function spawnJetStreak(x, y, angleDeg) {
            var len   = 36 + Math.random() * 54;
            var waves = 2 + Math.floor(Math.random() * 3);
            var amp   = 0.6 + Math.random() * 1.0;
            var sw    = 0.8 + Math.random() * 0.9;
            var rot   = (angleDeg + 180 + (Math.random() - 0.5) * 22).toFixed(1);
            var uid   = 'js' + (++_jid);

            // Build cubic bezier squiggle along the x-axis
            var seg = len / waves;
            var d   = 'M0,0';
            for (var w = 0; w < waves; w++) {
                var s = w % 2 === 0 ? -1 : 1;
                d += ' C' + (seg*(w+0.30)).toFixed(1) + ',' + (s*amp).toFixed(1) +
                     ' '  + (seg*(w+0.70)).toFixed(1) + ',' + (-s*amp).toFixed(1) +
                     ' '  + (seg*(w+1)).toFixed(1)    + ',0';
            }

            var el = document.createElement('div');
            el.style.cssText =
                'position:fixed;pointer-events:none;z-index:192;' +
                'left:' + x + 'px;top:' + y + 'px;' +
                'transform-origin:0px 0px;transform:rotate(' + rot + 'deg);';
            el.innerHTML =
                '<svg width="1" height="1" overflow="visible" xmlns="http://www.w3.org/2000/svg">' +
                '<defs><linearGradient id="' + uid + '" gradientUnits="userSpaceOnUse"' +
                ' x1="0" y1="0" x2="' + len.toFixed(0) + '" y2="0">' +
                '<stop offset="0%" stop-color="white" stop-opacity="0.65"/>' +
                '<stop offset="100%" stop-color="white" stop-opacity="0"/>' +
                '</linearGradient></defs>' +
                '<path d="' + d + '" fill="none" stroke="url(#' + uid + ')"' +
                ' stroke-width="' + sw.toFixed(1) + '" stroke-linecap="round"/>' +
                '</svg>';
            document.body.appendChild(el);
            el.animate(
                [{opacity:1},{opacity:0}],
                {duration: 1600 + Math.random()*1000, easing:'ease-out', fill:'forwards'}
            ).onfinish = function () { el.remove(); };
        }

        var RUN_DUR    = 3500;
        var MAX_SWING  = 0.90;
        var LEG_LIFT   = 22;
        var HIND_BASE  = -0.14;
        var FORE_BASE  =  0.10;
        var SPRING_K   = 0.048;  // stiffness — lower = more lag
        var DAMPING    = 0.91;   // velocity retention — higher = more float/overshoot
        var startTs    = null, rafId;
        var smoothAngle = -30; // angle lerped each frame for silky rotation

        function tick(ts) {
            if (!startTs) startTs = ts;
            var elapsed = ts - startTs;
            var t = elapsed / RUN_DUR;
            if (t >= 1) { stag.remove(); return; }

            // Evaluate the continuous Gaussian path at t and t+dt
            function evalPath(s) {
                var x = P0x + s * (P1x - P0x);
                var y = P0y + s * (P1y - P0y);
                for (var k = 0; k < HUMPS.length; k++) {
                    var d = s - HUMPS[k].c;
                    y -= HUMPS[k].a * Math.exp(-(d*d) / (2*HUMPS[k].w*HUMPS[k].w));
                }
                return {x: x, y: y};
            }

            // Global ease: t*(t+1)/2 keeps speed above zero, builds toward end
            var te  = t * (t + 1) / 2;
            var p   = evalPath(te);
            var pN  = evalPath(Math.min(te + 0.004, 0.998));
            var cx  = p.x,  cy  = p.y;
            var rawAngle = Math.atan2(pN.y - cy, pN.x - cx) * 180 / Math.PI;

            // Lerp the displayed angle toward target — prevents harsh snapping turns
            var da = ((rawAngle - smoothAngle) + 540) % 360 - 180;
            smoothAngle += da * 0.022;
            // Never point nose-down — stag always looks like it's rising or floating
            smoothAngle = Math.min(smoothAngle, 0);

            // Fade in at very start, out at very end
            var op = t < 0.08 ? t/0.08 : t > 0.90 ? (1-t)/0.10 : 1;

            var tx = cx - deerW * 0.5;
            var ty = cy - deerH * 0.5;
            stag.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
            stag.style.opacity   = op;

            if (rootG) rootG.setAttribute('transform',
                'rotate(' + smoothAngle.toFixed(1) + ',100,75)');


            // Phase-offset leg extensions: hind legs push off before the peak,
            // fore legs reach forward after — creating a natural wave through the body.
            var hindExt = 0, foreExt = 0;
            for (var k = 0; k < HUMPS.length; k++) {
                var d   = te - HUMPS[k].c;
                var sig = d / HUMPS[k].w;
                var win = Math.exp(-(d*d) / (2 * Math.pow(HUMPS[k].w * 1.15, 2)));
                // Hind legs peak 0.55 sigma before hump (push-off)
                hindExt = Math.max(hindExt, win * Math.exp(-Math.pow(sig + 0.55, 2) * 0.65));
                // Fore legs peak 0.40 sigma after hump (reach-forward)
                foreExt = Math.max(foreExt, win * Math.exp(-Math.pow(sig - 0.40, 2) * 0.65));
            }
            hindExt = Math.min(1, hindExt);
            foreExt = Math.min(1, foreExt);

            for (var i = 0; i < LEGS.length; i++) {
                var lg    = LEGS[i];
                if (!lg.el) continue;
                var scale     = lg.near ? 1.0 : 0.75;
                var base      = lg.hind ? HIND_BASE : FORE_BASE;
                var dir       = lg.hind ? -1 : 1;
                var ext       = lg.hind ? hindExt : foreExt;
                var targetAng = base + dir * ext * MAX_SWING * scale + (lg.splay || 0);
                // Spring-damper: leg drifts toward target with inertia
                lg.vel = (lg.vel + (targetAng - lg.ang) * SPRING_K) * DAMPING;
                lg.ang += lg.vel;
                var ang = lg.ang;
                var sinA  = Math.sin(ang);
                var cosA  = Math.cos(ang);
                var hx    = lg.ax + sinA * lg.len;
                var hy    = lg.ay + cosA * lg.len - Math.abs(sinA) * LEG_LIFT;
                var kBias = lg.hind ? -8 : 8;
                var kx    = (lg.ax + hx) / 2 + kBias;
                var ky    = (lg.ay + hy) / 2;

                // Jet smoke streaks from each hoof
                if (op > 0.08 && Math.random() < 0.18 + 0.22 * ext) {
                    var sRad = smoothAngle * Math.PI / 180;
                    var sDx  = (hx-100)*Math.cos(sRad) - (hy-75)*Math.sin(sRad);
                    var sDy  = (hx-100)*Math.sin(sRad) + (hy-75)*Math.cos(sRad);
                    spawnJetStreak(
                        tx + (100+sDx)/200 * deerW,
                        ty + (75 +sDy)/150 * deerH,
                        smoothAngle
                    );
                }

                lg.el.setAttribute('d',
                    'M' + lg.ax + ',' + lg.ay +
                    ' Q' + kx.toFixed(1) + ',' + ky.toFixed(1) +
                    ' ' + hx.toFixed(1) + ',' + hy.toFixed(1));
            }

            // Trail particles from the nose/head, streaming opposite to travel
            if (op > 0.08) {
                var rad = smoothAngle * Math.PI / 180;
                var rDx = (178-100)*Math.cos(rad) - (40-75)*Math.sin(rad);
                var rDy = (178-100)*Math.sin(rad) + (40-75)*Math.cos(rad);
                var px  = tx + (100+rDx)/200 * deerW;
                var py  = ty + (75 +rDy)/150 * deerH;
                if (Math.random() < 0.80) spawnTrail(px, py, smoothAngle);
                if (Math.random() < 0.45) spawnTrail(
                    px + (Math.random()-0.5)*deerW*0.18,
                    py + (Math.random()-0.5)*deerH*0.18, smoothAngle);
                if (Math.random() < 0.18) {
                    var r = stag.getBoundingClientRect();
                    for (var j = 0; j < 4; j++)
                        spawnTrail(r.left + Math.random()*r.width*0.45,
                                   r.top  + Math.random()*r.height*0.85, smoothAngle);
                }
            }

            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);
        setTimeout(function () {
            cancelAnimationFrame(rafId);
            if (stag.parentNode) stag.remove();
        }, RUN_DUR + 300);
    }

    // ── Trail particle — streams opposite to direction of travel
    function spawnTrail(x, y, travelAngleDeg) {
        var el   = document.createElement('div');
        var size = 2.5 + Math.random() * 5.5;
        var cols = ['#c8e6ff','#a8d4ff','#e0f0ff','#88c8ff','#d6efff','#ffffff'];
        var c    = cols[Math.floor(Math.random() * cols.length)];
        var rad  = (travelAngleDeg + 180) * Math.PI / 180;
        var dist = 22 + Math.random() * 48;
        var dx   = Math.cos(rad) * dist + (Math.random()-0.5) * 18;
        var dy   = Math.sin(rad) * dist + (Math.random()-0.5) * 18;
        var dur  = 1000 + Math.random() * 1200;
        el.style.cssText =
            'position:fixed;pointer-events:none;z-index:192;border-radius:50%;' +
            'left:' + (x - size/2) + 'px;top:' + (y - size/2) + 'px;' +
            'width:' + size + 'px;height:' + size + 'px;' +
            'background:' + c + ';box-shadow:0 0 ' + (size*2.2) + 'px ' + c + ';';
        document.body.appendChild(el);
        el.animate([
            {transform:'translate(0,0) scale(1)',               opacity:0.9},
            {transform:'translate('+dx+'px,'+dy+'px) scale(0)', opacity:0  }
        ], {duration:dur, easing:'ease-out', fill:'forwards'})
            .onfinish = function () { el.remove(); };
    }

    // ── Stag SVG — legs are <path> elements with IDs, animated each frame
    function getStagSVG() {
        var c = '#c8e6ff';
        return [
            '<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" overflow="visible">',
            '<g id="p-root" opacity="0.55">',

            // Body mass — ry tall enough to reach leg attachment points (ay≈107‑110)
            '<ellipse cx="95"  cy="90" rx="50" ry="23" fill="',c,'"/>',
            '<ellipse cx="50"  cy="82" rx="16" ry="13" fill="',c,'"/>',  // haunch
            '<ellipse cx="142" cy="70" rx="12" ry="20" transform="rotate(15,142,70)" fill="',c,'"/>',  // chest

            // Neck — rotated ellipse instead of polygon to avoid visible corners
            '<ellipse cx="152" cy="55" rx="21" ry="7"  transform="rotate(-22,152,55)" fill="',c,'"/>',
            // Head
            '<ellipse cx="164" cy="44" rx="17" ry="12" transform="rotate(-12,164,44)" fill="',c,'"/>',
            '<ellipse cx="178" cy="40" rx="11" ry="7"  transform="rotate(-6,178,40)"  fill="',c,'"/>',
            '<ellipse cx="154" cy="28" rx="5"  ry="10" transform="rotate(18,154,28)"  fill="',c,'"/>',
            // Tail — repositioned onto haunch with slightly larger radius
            '<ellipse cx="38"  cy="72" rx="8"  ry="12" transform="rotate(-18,38,72)"  fill="',c,'"/>',

            // Legs — far-side pair drawn first (behind body), then near-side
            // Initial d = straight-down resting pose; tick() overwrites every frame
            '<g fill="none" stroke="',c,'" stroke-linecap="round" stroke-linejoin="round">',
            '<path id="p-h2" stroke-width="6"  d="M72,110 Q64,129 72,148"/>',
            '<path id="p-f2" stroke-width="6"  d="M132,106 Q140,126 132,147"/>',
            '<path id="p-h1" stroke-width="9"  d="M62,107 Q54,128 62,148"/>',
            '<path id="p-f1" stroke-width="9"  d="M120,108 Q128,128 120,148"/>',
            '</g>',

            // Antlers
            '<g fill="none" stroke="',c,'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M153,25 L147,8 M147,8 L141,2 M147,8 L152,2 M147,13 L154,8"/>',
            '<path d="M163,22 L164,5 M164,5 L158,0 M164,5 L169,1 M164,11 L170,7"/>',
            '</g>',

            '</g></svg>'
        ].join('');
    }

    // ── Hidden trigger circle
    var dot = document.createElement('div');
    dot.style.cssText =
        'position:fixed;bottom:26px;right:26px;z-index:200;' +
        'width:11px;height:11px;border-radius:50%;' +
        'background:#fff;opacity:0.15;cursor:pointer;' +
        'transition:opacity 0.35s ease,box-shadow 0.35s ease;';
    dot.addEventListener('mouseenter', function () {
        dot.style.opacity = '0.55';
        dot.style.boxShadow = '0 0 8px rgba(255,255,255,0.55)';
    });
    dot.addEventListener('mouseleave', function () {
        dot.style.opacity = '0.15';
        dot.style.boxShadow = 'none';
    });
    dot.addEventListener('click', castPatronus);
    document.body.appendChild(dot);

})();
