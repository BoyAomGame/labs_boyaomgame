import path from 'path';

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const FILENAME_RE = /^[a-z0-9._-]+$/;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function isValidFilename(filename: string): boolean {
  if (filename === '.' || filename === '..') return false;
  return FILENAME_RE.test(filename);
}

/**
 * Join root + parts and assert the result stays under root (traversal guard).
 * Throws if the path escapes.
 */
export function safeJoin(root: string, ...parts: string[]): string {
  const resolvedRoot = path.resolve(root);
  const joined = path.resolve(resolvedRoot, ...parts);
  if (!joined.startsWith(resolvedRoot + path.sep) && joined !== resolvedRoot) {
    throw new Error(`Path traversal detected: ${joined} is not under ${resolvedRoot}`);
  }
  return joined;
}
