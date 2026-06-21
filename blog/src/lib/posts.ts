import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { getPostsDir, SLUG_RE, safeJoin } from './config.js';

/** Zod schema for post frontmatter. */
const FrontmatterSchema = z.object({
  title: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'date must be ISO format YYYY-MM-DD'),
  slug: z.string().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  draft: z.boolean().optional(),
});

export type PostMeta = {
  title: string;
  date: string;
  slug: string;
  cover?: string;
  tags?: string[];
  draft?: boolean;
};

/** Returns the canonical URL for a post's cover image. */
export function coverUrl(slug: string, cover: string): string {
  return `/blog/images/${slug}/${cover}`;
}

/**
 * List all valid, published posts sorted by date descending.
 * Invalid frontmatter entries are skipped with a console.warn.
 * Draft posts are hidden when NODE_ENV === 'production'.
 */
export function listPosts(): PostMeta[] {
  const postsDir = getPostsDir();

  if (!fs.existsSync(postsDir)) {
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(postsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const posts: PostMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirSlug = entry.name;

    // Validate directory name as slug
    if (!SLUG_RE.test(dirSlug)) {
      console.warn(`[blog] skipping post dir with invalid slug: "${dirSlug}"`);
      continue;
    }

    const mdPath = path.join(postsDir, dirSlug, 'index.md');
    if (!fs.existsSync(mdPath)) {
      console.warn(`[blog] skipping "${dirSlug}": no index.md`);
      continue;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(mdPath, 'utf8');
    } catch (err) {
      console.warn(`[blog] could not read "${mdPath}":`, err);
      continue;
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch (err) {
      console.warn(`[blog] could not parse frontmatter in "${mdPath}":`, err);
      continue;
    }

    const result = FrontmatterSchema.safeParse(parsed.data);
    if (!result.success) {
      console.warn(`[blog] invalid frontmatter in "${mdPath}":`, result.error.flatten());
      continue;
    }

    const fm = result.data;

    // Derive slug (frontmatter slug takes precedence, falls back to dir name)
    const slug = fm.slug ?? dirSlug;

    // Validate the resolved slug
    if (!SLUG_RE.test(slug)) {
      console.warn(`[blog] skipping "${dirSlug}": invalid slug value "${slug}"`);
      continue;
    }

    // Hide drafts in production
    if (fm.draft === true && process.env.NODE_ENV === 'production') {
      continue;
    }

    posts.push({
      title: fm.title,
      date: fm.date,
      slug,
      cover: fm.cover,
      tags: fm.tags,
      draft: fm.draft,
    });
  }

  // Sort by date descending
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}

/**
 * Load a single post by slug. Returns {meta, body} or null if not found/invalid.
 */
export function getPost(slug: string): { meta: PostMeta; body: string } | null {
  if (!SLUG_RE.test(slug)) {
    return null;
  }

  const postsDir = getPostsDir();
  let mdPath: string;
  try {
    mdPath = safeJoin(postsDir, slug, 'index.md');
  } catch {
    return null;
  }

  if (!fs.existsSync(mdPath)) {
    return null;
  }

  let raw: string;
  try {
    raw = fs.readFileSync(mdPath, 'utf8');
  } catch (err) {
    console.warn(`[blog] could not read "${mdPath}":`, err);
    return null;
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (err) {
    console.warn(`[blog] could not parse frontmatter in "${mdPath}":`, err);
    return null;
  }

  const result = FrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    console.warn(`[blog] invalid frontmatter in "${mdPath}":`, result.error.flatten());
    return null;
  }

  const fm = result.data;
  const resolvedSlug = fm.slug ?? slug;

  if (!SLUG_RE.test(resolvedSlug)) {
    return null;
  }

  return {
    meta: {
      title: fm.title,
      date: fm.date,
      slug: resolvedSlug,
      cover: fm.cover,
      tags: fm.tags,
      draft: fm.draft,
    },
    body: parsed.content,
  };
}
