// Tiny static server tailored for Astro's directory-style output (path/index.html).
// No external dependencies. Resolves /foo/ -> dist/foo/index.html, serves real
// files at their own paths, and returns dist/404.html (or a plain 404) otherwise.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve('dist');
const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.pdf':  'application/pdf',
  '.map':  'application/json; charset=utf-8',
};

function safeJoin(base, target) {
  const resolved = path.resolve(base, '.' + target);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body) res.end(body); else res.end();
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return notFound(res);
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const isHashed = /\.[a-f0-9]{8,}\./i.test(path.basename(filePath));
    const headers = {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': isHashed
        ? 'public, max-age=31536000, immutable'
        : (ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=3600'),
    };
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

function notFound(res) {
  const fourOhFour = path.join(ROOT, '404.html');
  fs.stat(fourOhFour, (err, stat) => {
    if (!err && stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': stat.size });
      fs.createReadStream(fourOhFour).pipe(res);
    } else {
      send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
    }
  });
}

const server = http.createServer((req, res) => {
  // An unparseable target (GET http://[/), a malformed escape (/%), a decoded NUL (/%00) or a decoded
  // control character in the redirect below each threw and stopped this process — reproduced locally
  // 2026-10-26. They answer 404 now.
  let parsed, pathname;
  try {
    parsed = url.parse(req.url);
    pathname = decodeURIComponent(parsed.pathname || '/');
  } catch {
    return notFound(res);
  }

  // Reject malformed paths
  const target = pathname.includes('\0') ? null : safeJoin(ROOT, pathname);
  if (!target) return notFound(res);

  fs.stat(target, (err, stat) => {
    if (!err && stat.isFile()) {
      return serveFile(res, target);
    }

    if (!err && stat.isDirectory()) {
      // Force trailing slash for directories so relative links resolve correctly.
      if (!pathname.endsWith('/')) {
        const qs = parsed.search || '';
        // One leading slash: //evil.example/..%2fabout redirected off-site (live, 2026-10-26).
        res.writeHead(301, { Location: (parsed.pathname || '/').replace(/^\/+/, '/') + '/' + qs });
        return res.end();
      }
      const indexPath = path.join(target, 'index.html');
      return fs.stat(indexPath, (e2, s2) => {
        if (!e2 && s2.isFile()) return serveFile(res, indexPath);
        return notFound(res);
      });
    }

    // Try appending .html for clean URLs like /about -> dist/about.html
    const htmlVariant = target + '.html';
    fs.stat(htmlVariant, (e3, s3) => {
      if (!e3 && s3.isFile()) return serveFile(res, htmlVariant);
      return notFound(res);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[pin] static server listening on :${PORT}, root=${ROOT}`);
});
