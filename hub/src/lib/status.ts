import * as fs from 'node:fs';
import * as path from 'node:path';

export function getDataDir(): string {
  return process.env.DATA_DIR
    ? process.env.DATA_DIR
    : path.resolve(process.cwd(), '..', 'misc', 'data');
}

export interface SystemStatus {
  maintenance: boolean;
  updatedAt: string;
}

export interface StatusFile {
  version: number;
  systems: Record<string, SystemStatus>;
}

export function readStatus(): StatusFile {
  const fallback: StatusFile = { version: 1, systems: {} };
  try {
    const filePath = path.join(getDataDir(), 'system-status.json');
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
