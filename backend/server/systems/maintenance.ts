import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '../config';
import { atomicWriteFile } from '../lib/atomicWrite';

const STATUS_FILE = path.join(DATA_DIR, 'system-status.json');

interface SystemStatus {
  maintenance: boolean;
  updatedAt: string;
}

interface StatusFile {
  version: number;
  systems: Record<string, SystemStatus>;
}

// Small in-process mutex: serialize all read-modify-writes via promise chain
let mutex: Promise<void> = Promise.resolve();

function defaultStatus(): StatusFile {
  const now = new Date().toISOString();
  return {
    version: 1,
    systems: {
      hub: { maintenance: false, updatedAt: now },
      blog: { maintenance: false, updatedAt: now },
    },
  };
}

export async function readStatus(): Promise<StatusFile> {
  try {
    const raw = await fs.readFile(STATUS_FILE, 'utf8');
    return JSON.parse(raw) as StatusFile;
  } catch {
    return defaultStatus();
  }
}

export async function setMaintenance(id: string, on: boolean): Promise<StatusFile> {
  const result = await new Promise<StatusFile>((resolve, reject) => {
    mutex = mutex.then(async () => {
      try {
        const status = await readStatus();
        if (!status.systems[id]) {
          status.systems[id] = { maintenance: false, updatedAt: new Date().toISOString() };
        }
        status.systems[id] = {
          maintenance: on,
          updatedAt: new Date().toISOString(),
        };
        const json = JSON.stringify(status, null, 2);
        await atomicWriteFile(STATUS_FILE, json);
        resolve(status);
      } catch (err) {
        reject(err);
      }
    });
  });
  return result;
}
