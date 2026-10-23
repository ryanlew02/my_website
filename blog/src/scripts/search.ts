import { search, snippet, type SearchDoc } from '../lib/search';
import { el } from '../lib/dom';

const input = document.querySelector<HTMLInputElement>('.search-box input')!;
const form = input.form!;
const results = document.querySelector<HTMLElement>('[data-search-results]')!;
const summary = document.querySelector<HTMLElement>('[data-search-summary]')!;
const filters = [...document.querySelectorAll<HTMLSelectElement>('[data-filter]')];
const dateFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

const params = new URLSearchParams(location.search);
input.value = params.get('q') ?? '';
for (const f of filters) f.value = params.get(f.dataset.filter!) ?? '';

let docs: SearchDoc[] = [];

function run() {
    const q = input.value.trim();
    const query = { q, tag: filters.find((f) => f.dataset.filter === 'tag')?.value || undefined,
        category: filters.find((f) => f.dataset.filter === 'category')?.value || undefined };
    const hits = search(docs, query);

    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (query.category) next.set('category', query.category);
    if (query.tag) next.set('tag', query.tag);
    history.replaceState(null, '', `${location.pathname}${next.size ? `?${next}` : ''}`);

    summary.textContent = q || query.tag || query.category
        ? `${hits.length} result${hits.length === 1 ? '' : 's'}${q ? ` for “${q}”` : ''}`
        : `${hits.length} post${hits.length === 1 ? '' : 's'}`;
    results.replaceChildren(...hits.map((d) => el('a', { class: 'post-row', href: `/blog/${d.slug}/` },
        el('div', { class: 'kicker' },
            el('time', { datetime: d.date, class: 'accent' }, dateFmt.format(new Date(d.date))),
            el('span', {}, d.category)),
        el('h3', { class: 'post-row-title' }, d.title),
        el('p', { class: 'post-row-desc' }, q ? snippet(d, q) : d.description),
        d.tags.length ? el('div', { class: 'post-row-foot' }, ...d.tags.slice(0, 4).map((t) => el('span', { class: 'chip' }, t))) : null)));
}

let timer: ReturnType<typeof setTimeout>;
input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
for (const f of filters) f.addEventListener('change', run);

fetch('/blog/search-index.json')
    .then((r) => r.json())
    .then((d: SearchDoc[]) => { docs = d; run(); })
    .catch(() => { summary.textContent = 'Search is unavailable right now.'; });
