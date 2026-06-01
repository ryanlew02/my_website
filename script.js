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
    var SPARK_COLORS = ['#c9a84c', '#ffd060', '#e8a030', '#f5c842', '#fff3cc', '#ffaa20'];

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
        document.querySelectorAll('.btn').forEach(function (el) {
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

    setInterval(spawnEmber, 550);
    for (var i = 0; i < 6; i++) setTimeout(spawnEmber, Math.random() * 2500);

})();
