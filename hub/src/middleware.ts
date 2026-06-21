import { defineMiddleware } from 'astro:middleware';
import { readStatus } from './lib/status.js';

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance — boyaomgame · labs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0f;
      color: #c9c9d4;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      max-width: 480px;
      text-align: center;
      border: 1px solid #2a2a3a;
      border-radius: 12px;
      padding: 3rem 2rem;
      background: #111118;
    }
    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #f59e0b;
      margin-bottom: 1.5rem;
      box-shadow: 0 0 8px #f59e0b88;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #e8e8f0;
      margin-bottom: 0.75rem;
    }
    p { color: #888899; line-height: 1.6; }
    .wordmark {
      font-family: ui-monospace, 'Cascadia Code', monospace;
      font-size: 0.8rem;
      color: #444458;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="dot"></span>
    <h1>Under Maintenance</h1>
    <p>boyaomgame&nbsp;·&nbsp;labs is temporarily unavailable while we make improvements. Check back soon.</p>
    <p class="wordmark">labs.boyaomgame.xyz</p>
  </div>
</body>
</html>`;

export const onRequest = defineMiddleware(async (context, next) => {
  const status = readStatus();
  if (status.systems?.hub?.maintenance === true) {
    return new Response(MAINTENANCE_HTML, {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '300',
      },
    });
  }
  return next();
});
