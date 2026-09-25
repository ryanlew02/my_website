/* Blog — post list, and the small shared behaviours this page needs.
 *
 * Deliberately standalone: the home page's script.js is 90KB of carousel,
 * bookshelf, ASCII portrait and terminal, none of which exists here. The only
 * things worth borrowing were the year stamp, the copy-email button and the
 * scroll reveal, so they are re-implemented below rather than pulled in.
 */
(function () {
    // ── Post data ─────────────────────────────────────────────────────────
    // Lives in posts.js, which loads first. Kept out of this file so adding a
    // post never means editing code — see blog/README.md.
    var POSTS = window.POSTS || [];

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;   // textContent, so a title can hold < or &
        return node;
    }

    function postCard(post) {
        var card = el('a', 'post');
        card.href = post.href;
        if (post.external) {
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
        }

        var meta = el('div', 'post-meta');
        meta.appendChild(el('time', 'post-date', post.date));
        if (post.read) meta.appendChild(el('span', 'post-read', post.read));
        card.appendChild(meta);

        // The arrow is decorative — the link already reads as its title.
        var title = el('h2', 'post-title', post.title);
        var arrow = el('span', 'post-arrow', post.external ? '↗' : '→');
        arrow.setAttribute('aria-hidden', 'true');
        title.appendChild(arrow);
        card.appendChild(title);

        if (post.excerpt) card.appendChild(el('p', 'post-excerpt', post.excerpt));

        if (post.tags && post.tags.length) {
            var tags = el('div', 'post-tags');
            post.tags.forEach(function (tag) {
                tags.appendChild(el('span', 'post-tag', tag));
            });
            card.appendChild(tags);
        }

        return card;
    }

    document.addEventListener('DOMContentLoaded', function () {
        // ── Posts ─────────────────────────────────────────────────────────
        // An empty array leaves the placeholder in index.html alone, so the
        // page never renders a blank column.
        var list = document.getElementById('postList');
        if (list && POSTS.length) {
            list.innerHTML = '';
            POSTS.forEach(function (post) { list.appendChild(postCard(post)); });
        }

        // ── Year stamps ───────────────────────────────────────────────────
        var year = new Date().getFullYear();
        ['year', 'blogYear'].forEach(function (id) {
            var node = document.getElementById(id);
            if (node) node.textContent = year;
        });

        // ── Copy-email button ─────────────────────────────────────────────
        // Same behaviour as the home page's footer, including the clipboard
        // fallback for pages served over plain http.
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

        // ── Scroll reveal ─────────────────────────────────────────────────
        // The .reveal class (defined in ../style.css) is only ever added here,
        // so nothing is hidden if this script doesn't run.
        if (!window.IntersectionObserver) return;

        var targets = document.querySelectorAll(
            '.blog-inner > *:not(.site-footer), .post-article > *'
        );
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        targets.forEach(function (node, i) {
            node.style.transitionDelay = Math.min(i, 4) * 90 + 'ms';
            node.classList.add('reveal');
            io.observe(node);
        });
    });
})();
