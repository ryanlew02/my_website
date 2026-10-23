#!/usr/bin/env node
// Serves ../dist like Hostinger does — directory index.html, the blog's 404
// page, and real file types — so the production build (with its CSP) can be
// checked locally. Not a production server.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.env.PREVIEW_ROOT ?? resolve(import.meta.dirname, '../../dist'));
const port = Number(process.env.PORT ?? 4322);
const types = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
    '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
    '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.txt': 'text/plain', '.ico': 'image/x-icon',
};

createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) {
        if (!path.endsWith('/')) { res.writeHead(301, { Location: path + '/' + url.search }).end(); return; }
        file = join(file, 'index.html');
    } else if (!existsSync(file) && existsSync(file + '.html')) {
        file += '.html';
    }
    if (!existsSync(file)) {
        const notFound = path.startsWith('/blog/') ? join(root, 'blog/404.html') : null;
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        if (notFound && existsSync(notFound)) createReadStream(notFound).pipe(res); else res.end('Not found');
        return;
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Previewing dist/ at http://localhost:${port}/blog/`));
