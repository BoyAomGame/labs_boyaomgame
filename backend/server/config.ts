import path from 'path';
import crypto from 'node:crypto';

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), '..', 'misc', 'data');

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
