import { marked, Renderer } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Render Markdown to sanitized HTML.
 * Rewrites relative `images/<file>` src attributes to `/blog/images/<slug>/<file>`.
 * Keeps external http(s) image srcs unchanged.
 */
export function renderMarkdown(md: string, slug: string): string {
  const renderer = new Renderer();

  // Override image renderer to rewrite relative image paths
  renderer.image = ({ href, title, text }: { href: string; title: string | null; text: string }) => {
    let src = href;
    // Rewrite relative images/<file> paths
    if (src && /^images\/[^/]/.test(src)) {
      const filename = src.slice('images/'.length);
      src = `/blog/images/${slug}/${filename}`;
    }
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(text)}"${titleAttr}>`;
  };

  marked.use({ renderer });

  const rawHtml = marked.parse(md) as string;

  // Sanitize HTML - allow common blog content elements
  const clean = sanitizeHtml(rawHtml, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'a', 'ul', 'ol', 'li',
      'code', 'pre', 'blockquote',
      'strong', 'em', 'hr',
      'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'br', 'span', 'div',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel', 'class'],
      'img': ['src', 'alt', 'title', 'class'],
      'code': ['class'],
      'pre': ['class'],
      'th': ['class'],
      'td': ['class'],
      'table': ['class'],
      'div': ['class'],
      'span': ['class'],
      'p': ['class'],
      'blockquote': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', '/'],
    // Allow /blog/images/... src on imgs
    allowedSchemesByTag: {
      'img': ['http', 'https', 'data', '/'],
    },
  });

  return clean;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
