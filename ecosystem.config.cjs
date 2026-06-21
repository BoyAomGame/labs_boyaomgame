// PM2 process definitions for the labs_boyaomgame mono-repo.
//
// Each sub-system runs as its own process so the backend control plane can
// start / stop / restart them independently (`pm2 start|stop|restart <name>`).
//
//   pm2 start ecosystem.config.cjs
//   pm2 ls
//   pm2 save           # persist the process list
//   pm2 startup        # (optional) start PM2 on boot
//
// Secrets and DATA_DIR should come from the host environment in production.
// The values below fall back to dev-friendly defaults.

const path = require('node:path');

// Load root .env if present (Node 20.6+ built-in). Does not override host env vars.
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch {}

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(__dirname, process.env.DATA_DIR)
  : path.join(__dirname, 'misc', 'data');

module.exports = {
  apps: [
    {
      name: 'labs-hub',
      cwd: path.join(__dirname, 'hub'),
      script: './dist/server/entry.mjs',
      env: {
        HOST: process.env.HUB_HOST || '127.0.0.1',
        PORT: process.env.HUB_PORT || 4321,
        DATA_DIR,
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
    },
    {
      name: 'labs-blog',
      cwd: path.join(__dirname, 'blog'),
      script: './dist/server/entry.mjs',
      env: {
        HOST: process.env.BLOG_HOST || '127.0.0.1',
        PORT: process.env.BLOG_PORT || 4322,
        DATA_DIR,
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
    },
    {
      name: 'labs-backend',
      cwd: path.join(__dirname, 'backend'),
      script: './dist/index.js',
      env: {
        HOST: process.env.BACKEND_HOST || '127.0.0.1',
        PORT: process.env.BACKEND_PORT || 4323,
        DATA_DIR,
        NODE_ENV: process.env.NODE_ENV || 'production',
        // Provide these via the host environment (do NOT commit real secrets):
        ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || '',
        SESSION_SECRET: process.env.SESSION_SECRET || '',
      },
    },
  ],
};
