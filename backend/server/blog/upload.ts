import multer from 'multer';
import path from 'path';
import { isValidFilename, isValidSlug, safeJoin } from './slug';
import { atomicWriteFile, ensureDir } from '../lib/atomicWrite';
import { DATA_DIR } from '../config';

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

// Magic byte validators
function isMagicPNG(buf: Buffer): boolean {
  return buf.length >= 4 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

function isMagicJPEG(buf: Buffer): boolean {
  return buf.length >= 3 &&
    buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function isMagicGIF(buf: Buffer): boolean {
  return buf.length >= 4 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
}

function isMagicWEBP(buf: Buffer): boolean {
  return buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50; // WEBP
}

function isSVG(buf: Buffer): boolean {
  // SVG is text; strip BOM and whitespace then check for <?xml or <svg
  let text = buf.toString('utf8').replace(/^﻿/, '').trimStart();
  return text.startsWith('<?xml') || text.startsWith('<svg');
}

export function validateImageBuffer(buf: Buffer, ext: string): boolean {
  switch (ext) {
    case 'png': return isMagicPNG(buf);
    case 'jpg':
    case 'jpeg': return isMagicJPEG(buf);
    case 'gif': return isMagicGIF(buf);
    case 'webp': return isMagicWEBP(buf);
    case 'svg': return isSVG(buf);
    default: return false;
  }
}

// Use memory storage so we can validate before writing
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error(`File type not allowed: ${ext}`));
      return;
    }
    cb(null, true);
  },
});

export async function saveUploadedImage(
  slug: string,
  file: Express.Multer.File
): Promise<string> {
  if (!isValidSlug(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }

  // Sanitize filename
  const originalName = file.originalname.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  if (!isValidFilename(originalName)) {
    throw new Error(`Invalid filename: ${file.originalname}`);
  }

  const ext = path.extname(originalName).slice(1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File type not allowed: ${ext}`);
  }

  // Validate magic bytes
  if (!validateImageBuffer(file.buffer, ext)) {
    throw new Error(`File content does not match extension: ${ext}`);
  }

  const imagesDir = safeJoin(DATA_DIR, 'posts', slug, 'images');
  await ensureDir(imagesDir);

  const target = safeJoin(imagesDir, originalName);
  await atomicWriteFile(target, file.buffer);

  return originalName;
}
