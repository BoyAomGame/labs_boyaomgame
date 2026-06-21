export interface SystemEntry {
  id: string;
  name: string;
  pm2: string;
}

export const SYSTEMS: SystemEntry[] = [
  { id: 'hub', name: 'Hub', pm2: 'labs-hub' },
  { id: 'blog', name: 'Blog', pm2: 'labs-blog' },
  // NOTE: backend is deliberately excluded to prevent self-lockout
];

export function isControllable(id: string): boolean {
  return SYSTEMS.some((s) => s.id === id);
}

export function getSystem(id: string): SystemEntry | undefined {
  return SYSTEMS.find((s) => s.id === id);
}
