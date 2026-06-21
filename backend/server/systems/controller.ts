import { SYSTEMS, isControllable, getSystem } from './registry';
import { readStatus, setMaintenance as setMaintenanceInFile } from './maintenance';
import { processState, processAction, Pm2UnavailableError } from './pm2';

export interface SystemInfo {
  id: string;
  name: string;
  maintenance: boolean;
  updatedAt: string;
  processState: string;
  pm2Available: boolean;
}

export async function getStatuses(): Promise<SystemInfo[]> {
  const status = await readStatus();
  const results: SystemInfo[] = [];

  for (const sys of SYSTEMS) {
    const maintenanceInfo = status.systems[sys.id] ?? {
      maintenance: false,
      updatedAt: new Date().toISOString(),
    };
    let pState = 'unknown';
    let pm2Available = true;
    try {
      pState = await processState(sys.pm2);
    } catch {
      pState = 'unknown';
      pm2Available = false;
    }
    // If processState returned 'unknown' due to pm2 absence, note that
    if (pState === 'unknown') pm2Available = false;

    results.push({
      id: sys.id,
      name: sys.name,
      maintenance: maintenanceInfo.maintenance,
      updatedAt: maintenanceInfo.updatedAt,
      processState: pState,
      pm2Available,
    });
  }

  return results;
}

export async function setMaintenance(id: string, on: boolean): Promise<{ maintenance: boolean }> {
  if (!isControllable(id)) {
    throw Object.assign(new Error(`System not controllable: ${id}`), { code: 'NOT_CONTROLLABLE' });
  }
  const status = await setMaintenanceInFile(id, on);
  return { maintenance: status.systems[id].maintenance };
}

export async function processControl(id: string, action: string): Promise<void> {
  if (!isControllable(id)) {
    throw Object.assign(new Error(`System not controllable: ${id}`), { code: 'NOT_CONTROLLABLE' });
  }
  const sys = getSystem(id);
  if (!sys) {
    throw Object.assign(new Error(`System not found: ${id}`), { code: 'NOT_FOUND' });
  }
  await processAction(sys.pm2, action);
}
