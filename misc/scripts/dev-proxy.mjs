#!/usr/bin/env node
// Minimal local reverse proxy that mirrors the Caddyfile path routing, for
// testing the full /, /blog, /backend layout when Caddy/nginx isn't installed.
//
//   node misc/scripts/dev-proxy.mjs        # listens on http://127.0.0.1:8080
//
// Like the real proxy, the path prefix is PASSED THROUGH unchanged, so each
// Astro app keeps its own `base`. Not for production — use the Caddyfile there.

import http from 'node:http';

const PORT = Number(process.env.PROXY_PORT || 8080);
const HUB = Number(process.env.HUB_PORT || 4321);
const BLOG = Number(process.env.BLOG_PORT || 4322);
const BACKEND = Number(process.env.BACKEND_PORT || 4323);

const routes = [
  [/^\/blog(\/|$|\?)/, BLOG],
  [/^\/backend(\/|$|\?)/, BACKEND],
];

const server = http.createServer((req, res) => {
  const target = routes.find(([re]) => re.test(req.url))?.[1] ?? HUB;
  const proxyReq = http.request(
    { host: '127.0.0.1', port: target, method: req.method, path: req.url, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('502 bad gateway (upstream down)');
  });
  req.pipe(proxyReq);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`dev-proxy http://127.0.0.1:${PORT}  ->  hub:${HUB}  /blog:${BLOG}  /backend:${BACKEND}`);
});
