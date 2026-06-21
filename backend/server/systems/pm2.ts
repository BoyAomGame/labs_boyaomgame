import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class Pm2UnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Pm2UnavailableError';
  }
}

interface Pm2ProcessInfo {
  name?: string;
  pm2_env?: {
    status?: string;
  };
  status?: string;
}

function mapStatus(status: string | undefined): string {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  if (s === 'online') return 'online';
  if (s === 'stopped') return 'stopped';
  if (s === 'stopping') return 'stopping';
  if (s === 'errored') return 'errored';
  if (s === 'launching') return 'launching';
  if (s === 'one-launch-status') return 'one-launch-status';
  return s;
}

export async function processState(pm2Name: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('pm2', ['jlist']);
    const list = JSON.parse(stdout) as Pm2ProcessInfo[];
    const proc = list.find((p) => p.name === pm2Name);
    if (!proc) return 'stopped';
    const status = proc.pm2_env?.status ?? proc.status;
    return mapStatus(status);
  } catch (err: any) {
    if (err.code === 'ENOENT') return 'unknown';
    // Parse failure or other error
    console.warn(`[pm2] processState(${pm2Name}) failed:`, err.message);
    return 'unknown';
  }
}

export async function processAction(pm2Name: string, action: string): Promise<void> {
  const VALID_ACTIONS = ['start', 'stop', 'restart', 'reload'];
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(`Invalid pm2 action: ${action}`);
  }
  try {
    await execFileAsync('pm2', [action, pm2Name]);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Pm2UnavailableError('pm2 is not available');
    }
    // pm2 returned non-zero exit
    throw new Pm2UnavailableError(`pm2 ${action} ${pm2Name} failed: ${err.message}`);
  }
}
