import fs from 'node:fs';
import path from 'path';
import crypto from 'node:crypto';

/**
 * Locate the repo root by walking up from this module's own directory until a
 * `misc` folder is found. This is cwd-independent, so a process launched from
 * the wrong working directory can't silently resolve DATA_DIR to an empty path.
 * Falls back to the documented cwd-relative default if no marker is found.
 */
function findRepoRoot(): string {
  let current = __dirname;
  while (true) {
    if (fs.existsSync(path.join(current, 'misc'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break; // reached filesystem root
    current = parent;
  }
  // Preserve the original default: <cwd>/../misc/data ⇒ repo root is <cwd>/..
  return path.resolve(process.cwd(), '..');
}

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(findRepoRoot(), 'misc', 'data');

export const HOST = process.env.HOST || '0.0.0.0';
export const PORT = parseInt(process.env.PORT || '4323', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isProd = NODE_ENV === 'production';

export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

let sessionSecret = process.env.SESSION_SECRET || '';
if (!sessionSecret) {
  const fallback = crypto.randomBytes(32).toString('hex');
  console.warn('[backend] WARNING: SESSION_SECRET not set; using a random ephemeral secret. Sessions will not survive restarts.');
  sessionSecret = fallback;
}
export const SESSION_SECRET = sessionSecret;
