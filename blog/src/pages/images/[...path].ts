import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { getDataDir, SLUG_RE, FILENAME_RE, safeJoin } from '../../lib/config.js';

const MIME_MAP: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

function contentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

export const GET: APIRoute = ({ params }) => {
  const rawPath = params.path ?? '';

  // Split: first segment = slug, rest = file path segments
  const segments = rawPath.split('/').filter(Boolean);

  if (segments.length < 2) {
    return new Response(null, { status: 404 });
  }

  const slug = segments[0];
  const fileSegments = segments.slice(1);

  // Validate slug
  if (!SLUG_RE.test(slug)) {
    return new Response(null, { status: 404 });
  }

  // Validate every file path segment
  for (const seg of fileSegments) {
    if (seg === '.' || seg === '..') {
      return new Response(null, { status: 404 });
    }
    if (!FILENAME_RE.test(seg)) {
      return new Response(null, { status: 404 });
    }
  }

  const filename = fileSegments[fileSegments.length - 1];
  if (!filename) {
    return new Response(null, { status: 404 });
  }

  const dataDir = getDataDir();
  let filePath: string;
  try {
    filePath = safeJoin(dataDir, 'posts', slug, 'images', ...fileSegments);
  } catch {
    return new Response(null, { status: 404 });
  }

  // Extra paranoia: ensure path stays under DATA_DIR/posts/<slug>/images
  const imagesRoot = path.resolve(dataDir, 'posts', slug, 'images');
  if (!filePath.startsWith(imagesRoot + path.sep) && filePath !== imagesRoot) {
    return new Response(null, { status: 404 });
  }

  if (!fs.existsSync(filePath)) {
    return new Response(null, { status: 404 });
  }

  let data: Buffer;
  try {
    data = fs.readFileSync(filePath);
  } catch {
    return new Response(null, { status: 500 });
  }

  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': contentType(filename),
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': String(data.length),
    },
  });
};
