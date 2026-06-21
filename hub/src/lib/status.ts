import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Locate the repo root by walking up from this module's own directory until a
 * `misc` folder is found. This is cwd-independent, so a process launched from
 * the wrong working directory can't silently resolve DATA_DIR to an empty path.
 * Falls back to the documented cwd-relative default if no marker is found.
 */
function findRepoRoot(): string {
  let current: string;
  try {
    current = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    current = process.cwd();
  }
  while (true) {
    if (fs.existsSync(path.join(current, 'misc'))) return current;
    const parent = path.dirname(current);
    if (parent === current) break; // reached filesystem root
    current = parent;
  }
  // Preserve the original default: <cwd>/../misc/data ⇒ repo root is <cwd>/..
  return path.resolve(process.cwd(), '..');
}

export function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(findRepoRoot(), 'misc', 'data');
}

export interface SystemStatus {
  maintenance: boolean;
  updatedAt: string;
}

export interface StatusFile {
  version: number;
  systems: Record<string, SystemStatus>;
}

let warnedMissingDataDir = false;

export function readStatus(): StatusFile {
  const fallback: StatusFile = { version: 1, systems: {} };
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir) && !warnedMissingDataDir) {
    console.warn(
      `[hub] DATA_DIR does not exist: "${dataDir}" — check the DATA_DIR env var / launch cwd.`
    );
    warnedMissingDataDir = true;
  }
  try {
    const filePath = path.join(dataDir, 'system-status.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      'systems' in parsed &&
      typeof (parsed as StatusFile).systems === 'object'
    ) {
      return parsed as StatusFile;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export interface SystemMeta {
  key: string;
  name: string;
  description: string;
  href: string | null;
  reserved: boolean;
}

export const SYSTEMS: SystemMeta[] = [
  {
    key: 'blog',
    name: 'Blog',
    description: 'Markdown notes & write-ups',
    href: '/blog',
    reserved: false,
  },
  {
    key: 'proxy-status',
    name: 'Proxy Status',
    description: 'Uptime of proxied services',
    href: null,
    reserved: true,
  },
  {
    key: 'mc-pinger',
    name: 'MC Pinger',
    description: 'Minecraft server pinger',
    href: null,
    reserved: true,
  },
];

export type SystemState = 'maintenance' | 'online' | 'coming-soon';

export function statusFor(meta: SystemMeta, status: StatusFile): SystemState {
  if (meta.reserved) return 'coming-soon';
  const sys = status.systems?.[meta.key];
  if (sys?.maintenance === true) return 'maintenance';
  return 'online';
}
