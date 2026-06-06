// ── Year ─────────────────────────────────────────────
const yr = document.getElementById('year');
if (yr) yr.textContent = new Date().getFullYear();

// ── iOS viewport height fix (dvh polyfill) ────────────
(function () {
    function setVH() {
        document.documentElement.style.setProperty('--dvh', window.innerHeight * 0.01 + 'px');
    }
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', function () {
        setTimeout(setVH, 150);
    });
})();

// ── Email copy (no HP sparks) ─────────────────────────
document.querySelectorAll('.dv-copy-email').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var email = btn.dataset.email;
        function onSuccess() {
            btn.textContent = 'Copied!';
            setTimeout(function () { btn.textContent = 'Email'; }, 2000);
        }
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(email).then(onSuccess);
        } else {
            var ta = document.createElement('textarea');
            ta.value = email;
            ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); onSuccess(); } catch (e) {}
            document.body.removeChild(ta);
        }
    });
});

// ── Remove HP wand dot injected by script.js ─────────
document.querySelectorAll('body > div').forEach(function (el) {
    if (el.style.top === '88px' && el.style.right === '20px') el.remove();
});

// ── Block HP patronus easter egg ──────────────────────
(function () {
    let buf = '';
    document.addEventListener('keydown', function (e) {
        buf = (buf + e.key).slice(-7).toLowerCase();
        if (buf.endsWith('expecto')) { buf = ''; e.stopImmediatePropagation(); }
    }, true);
})();

// ── Side dot navigation ───────────────────────────────
(function () {
    const scrollEl = document.getElementById('dv-scroll');
    const dots     = document.querySelectorAll('.dv-dot');
    const snaps    = document.querySelectorAll('.dv-snap');

    dots.forEach(function (dot) {
        dot.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.getElementById(dot.getAttribute('href').slice(1));
            if (target && scrollEl) scrollEl.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
        });
    });

    if (snaps.length && dots.length) {
        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    dots.forEach(function (d) {
                        d.classList.toggle('active', d.getAttribute('href') === '#' + id);
                    });
                }
            });
        }, { root: scrollEl, threshold: 0.5 });
        snaps.forEach(function (s) { io.observe(s); });
    }
})();

// ── Faction particle system (canvas) ──────────────────
(function () {
    const canvas = document.getElementById('dv-particles');
    const ctx    = canvas.getContext('2d');
    const FACTIONS = [
        { color: '#e84830', glow: 'rgba(232,72,48,0.6)',   symbols: ['◆', '▲', '✦'] },
        { color: '#89b4fa', glow: 'rgba(137,180,250,0.6)', symbols: ['●', '◇', '⬡'] },
        { color: '#d4821a', glow: 'rgba(212,130,26,0.6)',  symbols: ['✿', '◆', '▲'] },
        { color: '#909090', glow: 'rgba(144,144,144,0.5)', symbols: ['◇', '○', '□'] },
        { color: '#c8c8c8', glow: 'rgba(200,200,200,0.5)', symbols: ['⚖', '◇', '◆'] },
        { color: '#f472b6', glow: 'rgba(244,114,182,0.6)', symbols: ['✦', '★', '◆'] },
    ];
    let particles = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    function Particle() {
        const f = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 10;
        this.symbol = f.symbols[Math.floor(Math.random() * f.symbols.length)];
        this.color = f.color; this.glow = f.glow;
        this.size = 7 + Math.random() * 9;
        this.speedY = 0.35 + Math.random() * 0.55;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.opacity = 0;
        this.maxOpacity = 0.12 + Math.random() * 0.22;
        this.life = 0; this.maxLife = 220 + Math.random() * 180;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.012;
    }
    Particle.prototype.update = function () {
        this.life++; this.y -= this.speedY; this.x += this.speedX; this.rotation += this.rotSpeed;
        const z = 40;
        this.opacity = this.life < z ? (this.life/z)*this.maxOpacity : this.life > this.maxLife-z ? ((this.maxLife-this.life)/z)*this.maxOpacity : this.maxOpacity;
    };
    Particle.prototype.draw = function () {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.font = `${this.size}px 'Share Tech Mono', monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = this.glow; ctx.shadowBlur = 10;
        ctx.fillStyle = this.color; ctx.fillText(this.symbol, 0, 0);
        ctx.restore();
    };
    let spawnTimer = 0;
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (++spawnTimer % 38 === 0) particles.push(new Particle());
        particles = particles.filter(p => p.life < p.maxLife);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(loop);
    }
    for (let i = 0; i < 8; i++) {
        const p = new Particle();
        p.y = Math.random() * canvas.height;
        p.life = Math.floor(Math.random() * 80);
        particles.push(p);
    }
    loop();
})();
