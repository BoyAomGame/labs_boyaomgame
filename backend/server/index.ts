import { createApp } from './app';
import { HOST, PORT, ADMIN_PASSWORD_HASH, SESSION_SECRET, NODE_ENV } from './config';

// Warn loudly about missing critical config
if (!ADMIN_PASSWORD_HASH) {
  console.warn('[backend] WARNING: ADMIN_PASSWORD_HASH is not set. Login will always fail.');
}
if (!process.env.SESSION_SECRET) {
  // SESSION_SECRET falls back to random in config.ts; warn is already printed there
}

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`[backend] Server running at http://${HOST}:${PORT}/backend (NODE_ENV=${NODE_ENV})`);
});
