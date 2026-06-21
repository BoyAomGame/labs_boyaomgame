import fs from 'node:fs';
import path from 'node:path';
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

/** Returns the DATA_DIR root — env var or repo-relative default. */
export function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(findRepoRoot(), 'misc', 'data');
}

/** Returns the posts directory inside DATA_DIR. */
export function getPostsDir(): string {
  return path.join(getDataDir(), 'posts');
}

/** Valid slug: lowercase alphanumeric + hyphens, no leading/trailing hyphens. */
export const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/** Valid image filename: lowercase alphanumeric, dots, hyphens, underscores. */
export const FILENAME_RE = /^[a-z0-9._-]+$/;

/**
 * Safely join root + parts, resolving the result and asserting it stays
 * under root. Throws if the resolved path would escape root.
 */
export function safeJoin(root: string, ...parts: string[]): string {
  const resolved = path.resolve(root, ...parts);
  const normalRoot = path.resolve(root);
  if (!resolved.startsWith(normalRoot + path.sep) && resolved !== normalRoot) {
    throw new Error(`Path traversal detected: ${resolved} escapes ${normalRoot}`);
  }
  return resolved;
}
