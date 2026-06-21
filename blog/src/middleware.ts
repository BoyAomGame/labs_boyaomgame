import { defineMiddleware } from 'astro:middleware';
import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from './lib/config.js';

export const onRequest = defineMiddleware(async (context, next) => {
  const dataDir = getDataDir();
  const statusFile = path.join(dataDir, 'system-status.json');

  let inMaintenance = false;
  try {
    if (fs.existsSync(statusFile)) {
      const raw = fs.readFileSync(statusFile, 'utf8');
      const json = JSON.parse(raw);
      inMaintenance = json?.systems?.blog?.maintenance === true;
    }
  } catch {
    // Missing or malformed file — treat as not in maintenance (fail-open)
    inMaintenance = false;
  }

  if (inMaintenance) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Maintenance — labs.boyaomgame.xyz</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f1117;color:#e2e8f0;font-family:system-ui,sans-serif;
         display:flex;align-items:center;justify-content:center;
         min-height:100dvh;text-align:center;padding:2rem}
    h1{font-size:2rem;font-weight:800;color:#fff;margin-bottom:1rem}
    p{color:#8892aa;max-width:40ch;line-height:1.6}
  </style>
</head>
<body>
  <div>
    <h1>Under Maintenance</h1>
    <p>The blog is temporarily offline for maintenance. Please check back soon.</p>
  </div>
</body>
</html>`,
      {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': '300',
        },
      }
    );
  }

  return next();
});
