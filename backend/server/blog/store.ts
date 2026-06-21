import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { DATA_DIR } from '../config';
import { slugify, isValidSlug, safeJoin } from './slug';
import { atomicWriteFile, ensureDir } from '../lib/atomicWrite';

const FrontmatterSchema = z.object({
  title: z.string(),
  date: z.string(),
  slug: z.string().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  draft: z.boolean().optional(),
});

export type PostFrontmatter = z.infer<typeof FrontmatterSchema>;

export interface Post extends PostFrontmatter {
  slug: string;
  body: string;
}

export interface CreatePostInput {
  title: string;
  date: string;
  slug?: string;
  tags?: string[];
  draft?: boolean;
  cover?: string;
  body?: string;
}

function postsDir(): string {
  return path.join(DATA_DIR, 'posts');
}

function postDir(slug: string): string {
  return safeJoin(postsDir(), slug);
}

export async function listPosts(): Promise<Post[]> {
  const dir = postsDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const posts: Post[] = [];
  for (const entry of entries) {
    if (!isValidSlug(entry)) continue;
    try {
      const post = await getPost(entry);
      if (post) posts.push(post);
    } catch (err) {
      console.warn(`[store] Skipping invalid post: ${entry}`, err);
    }
  }
  // Sort by date descending
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!isValidSlug(slug)) return null;
  const filePath = path.join(postDir(slug), 'index.md');
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }

  try {
    const parsed = matter(content);
    const fm = FrontmatterSchema.parse(parsed.data);
    return {
      ...fm,
      slug,
      body: parsed.content,
    };
  } catch (err) {
    console.warn(`[store] Invalid frontmatter for post: ${slug}`, err);
    return null;
  }
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const derivedSlug = input.slug
    ? input.slug
    : slugify(input.title);

  if (!isValidSlug(derivedSlug)) {
    throw Object.assign(new Error(`Invalid slug: ${derivedSlug}`), { code: 'INVALID_SLUG' });
  }

  const dir = postDir(derivedSlug);
  // Check if post already exists
  try {
    await fs.access(path.join(dir, 'index.md'));
    throw Object.assign(new Error(`Post already exists: ${derivedSlug}`), { code: 'EXISTS' });
  } catch (err: any) {
    if (err.code === 'EXISTS') throw err;
    // ENOENT is fine — post doesn't exist yet
  }

  await ensureDir(dir);
  await ensureDir(path.join(dir, 'images'));

  const frontmatter: PostFrontmatter = {
    title: input.title,
    date: input.date,
    slug: derivedSlug,
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.draft !== undefined && { draft: input.draft }),
    ...(input.cover !== undefined && { cover: input.cover }),
  };

  const fileContent = matter.stringify(input.body || '', frontmatter);
  await atomicWriteFile(path.join(dir, 'index.md'), fileContent);

  return { ...frontmatter, slug: derivedSlug, body: input.body || '' };
}

export async function updatePost(
  slug: string,
  fields: Partial<Omit<CreatePostInput, 'slug'>>
): Promise<Post> {
  const existing = await getPost(slug);
  if (!existing) {
    throw Object.assign(new Error(`Post not found: ${slug}`), { code: 'NOT_FOUND' });
  }

  const updated: PostFrontmatter = {
    title: fields.title ?? existing.title,
    date: fields.date ?? existing.date,
    slug: existing.slug,
    ...(existing.cover !== undefined || fields.cover !== undefined
      ? { cover: fields.cover ?? existing.cover }
      : {}),
    ...(existing.tags !== undefined || fields.tags !== undefined
      ? { tags: fields.tags ?? existing.tags }
      : {}),
    ...(existing.draft !== undefined || fields.draft !== undefined
      ? { draft: fields.draft ?? existing.draft }
      : {}),
  };

  const body = fields.body !== undefined ? fields.body : existing.body;
  const fileContent = matter.stringify(body, updated);
  await atomicWriteFile(path.join(postDir(slug), 'index.md'), fileContent);

  return { ...updated, slug, body };
}

export async function deletePost(slug: string): Promise<void> {
  if (!isValidSlug(slug)) {
    throw Object.assign(new Error(`Invalid slug: ${slug}`), { code: 'INVALID_SLUG' });
  }
  const dir = postDir(slug);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
}
