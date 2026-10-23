/**
 * Tiny DOM builder for client scripts. Children that are strings become text
 * nodes, so user-supplied content can never be parsed as HTML. There is
 * deliberately no innerHTML path in here.
 */
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') {
            node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
        } else if (k === 'class') {
            node.className = String(v);
        } else if (v === true) {
            node.setAttribute(k, '');
        } else {
            node.setAttribute(k, String(v));
        }
    }
    append(node, ...children);
    return node;
}

export function append(parent: Node, ...children: Child[]) {
    for (const c of children) {
        if (c === null || c === undefined || c === false) continue;
        parent.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
}

/** Plain text with bare http(s) links made clickable — still built from text nodes. */
export function linkifiedText(text: string): DocumentFragment {
    const frag = document.createDocumentFragment();
    const re = /\bhttps?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/g;
    let last = 0;
    for (const m of text.matchAll(re)) {
        const i = m.index ?? 0;
        if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)));
        const a = document.createElement('a');
        a.href = m[0];
        a.textContent = m[0];
        a.rel = 'nofollow ugc noopener noreferrer';
        a.target = '_blank';
        frag.appendChild(a);
        last = i + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string) {
    let t = document.getElementById('toast');
    if (!t) {
        t = el('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
        document.body.appendChild(t);
    }
    t.textContent = message;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t!.hidden = true; }, 3200);
}

/** Native <dialog> confirm. Resolves true when confirmed. */
export function confirmDialog(message: string, confirmLabel = 'Delete', danger = true): Promise<boolean> {
    return new Promise((resolve) => {
        const ok = el('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, value: 'ok' }, confirmLabel);
        const cancel = el('button', { class: 'btn', value: 'cancel', autofocus: true }, 'Cancel');
        const d = el('dialog', { class: 'confirm' },
            el('form', { method: 'dialog' }, el('p', {}, message), el('div', { class: 'dialog-actions' }, cancel, ok)));
        document.body.appendChild(d);
        d.addEventListener('close', () => { resolve(d.returnValue === 'ok'); d.remove(); });
        d.showModal();
    });
}
