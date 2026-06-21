import path from 'node:path';

/** Returns the DATA_DIR root — env var or repo-relative default. */
export function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), '..', 'misc', 'data');
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
