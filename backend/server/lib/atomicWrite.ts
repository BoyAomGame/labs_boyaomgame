import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function atomicWriteFile(target: string, data: string | Buffer): Promise<void> {
  const dir = path.dirname(target);
  await ensureDir(dir);
  const tmp = path.join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    await fs.writeFile(tmp, data, { encoding: typeof data === 'string' ? 'utf8' : undefined });
    await fs.rename(tmp, target);
  } catch (err) {
    // Clean up temp file if rename fails
    try { await fs.unlink(tmp); } catch {}
    throw err;
  }
}
