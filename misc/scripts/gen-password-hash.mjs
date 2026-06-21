#!/usr/bin/env node
// Generate an scrypt password hash for the backend admin login.
//
//   node misc/scripts/gen-password-hash.mjs 'your-password'
//
// Put the printed value into backend/.env (or the host env / ecosystem.config.cjs)
// as ADMIN_PASSWORD_HASH. Output format:  scrypt:<saltHex>:<hashHex>
//
// Uses only Node's built-in crypto — no dependencies, no native build.

import { scryptSync, randomBytes } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error("Usage: node misc/scripts/gen-password-hash.mjs '<password>'");
  process.exit(1);
}

// Matches the verifier in backend/server/auth/password.ts
const KEYLEN = 64;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, KEYLEN);

console.log(`scrypt:${salt.toString('hex')}:${hash.toString('hex')}`);
