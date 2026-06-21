import crypto from 'node:crypto';
import * as cookieLib from 'cookie';
import type { Request, Response } from 'express';
import { SESSION_SECRET, isProd } from '../config';

const COOKIE_NAME = 'labs_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hmac(data: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

export function sign(): string {
  const payload = Buffer.from(JSON.stringify({ iat: Date.now() })).toString('base64url');
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

export function verify(token: string): boolean {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return false;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = hmac(payload);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.iat !== 'number') return false;
    if (Date.now() - data.iat > MAX_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export function setSession(res: Response): void {
  const token = sign();
  const serialized = cookieLib.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/backend',
    secure: isProd,
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  });
  res.setHeader('Set-Cookie', serialized);
}

export function clearSession(res: Response): void {
  const serialized = cookieLib.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/backend',
    secure: isProd,
    maxAge: 0,
    expires: new Date(0),
  });
  res.setHeader('Set-Cookie', serialized);
}

export function isAuthed(req: Request): boolean {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return false;
    const cookies = cookieLib.parse(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return false;
    return verify(token);
  } catch {
    return false;
  }
}
