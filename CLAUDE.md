# CLAUDE.md — agent guide & frozen contract

Read this **before creating any file**. It defines the immovable rules and the shared
contract every sub-system must follow.

## What this repo is
A mini mono-repo of independent sub-systems served at `labs.boyaomgame.xyz` via path-based
routing behind a reverse proxy (Caddy). Each sub-system runs as its own PM2 process. The
`backend/` control plane posts blogs and starts/stops the other systems.

## STRICT top-level folder rule (never violate)
Allowed top-level folders ONLY:

| Folder          | Status                       |
| --------------- | ---------------------------- |
| `hub/`          | active — landing (Astro SSR) |
| `blog/`         | active — blog reader (Astro SSR), reads `DATA_DIR` |
| `backend/`      | active — Express API + Astro admin UI |
| `proxy-status/` | **RESERVED — DO NOT CREATE** |
| `mc-pinger/`    | **RESERVED — DO NOT CREATE** |
| `misc/`         | active — scripts, dev data, notes |

- Loose top-level **files** are fine (`README.md`, `CLAUDE.md`, `.gitignore`, `.env.example`,
  `ecosystem.config.cjs`, `Caddyfile`, `nginx.conf.example`).
- **Never** create any other top-level folder. **Never** create `proxy-status/` or
  `mc-pinger/` until explicitly told to.
- Put scratch / scripts / dev data / notes under `misc/`.
- A system may split internal tiers `frontend/` + `server/`. Use `backend/server/` +
  `backend/frontend/` — **never** `backend/backend/`.
- **Per-app `package.json`, independent `npm install`, NO workspaces, NO root
  `package.json`.**

## Ports & PM2 names (fixed)
| System  | PM2 name      | Port |
| ------- | ------------- | ---- |
| hub     | `labs-hub`    | 4321 |
| blog    | `labs-blog`   | 4322 |
| backend | `labs-backend`| 4323 |

## Routing (critical — the asset-resolution linchpin)
The reverse proxy **passes the path prefix through** (Caddy `handle /blog*`, NOT
`handle_path`). Each Astro app **owns its `base`**:
- hub `base: '/'`, blog `base: '/blog'`, backend admin `base: '/backend'`, all
  `trailingSlash: 'never'`.

This makes each app emit prefixed assets (`/blog/_astro/…`) so the three apps never collide
on one origin. Do **not** strip prefixes at the proxy. Use links/asset URLs that respect
`base` (Astro's `import.meta.env.BASE_URL`).

## FROZEN data contract (`DATA_DIR`)
A shared runtime volume read by hub & blog and written by backend.

- Resolution: env `DATA_DIR`; if unset, default to `<repo-root>/misc/data`, i.e.
  `path.resolve(process.cwd(), '..', 'misc', 'data')` (each app runs with its own dir as
  cwd). Never make this a top-level folder; `misc/data/` is gitignored.

Layout:
```
$DATA_DIR/
  system-status.json
  posts/
    <slug>/
      index.md          # YAML frontmatter + Markdown body
      images/
        <file>          # uploaded images for this post
```

`system-status.json`:
```json
{
  "version": 1,
  "systems": {
    "hub":  { "maintenance": false, "updatedAt": "2026-06-21T00:00:00.000Z" },
    "blog": { "maintenance": false, "updatedAt": "2026-06-21T00:00:00.000Z" }
  }
}
```
- `maintenance: true` ⇒ that system serves a maintenance page instead of normal content.
- Unknown system id ⇒ treated as **not** in maintenance (fail-open on read).
- Only ids present in the backend registry may be toggled. If the file is missing, treat all
  systems as online and create it on first write.

Post frontmatter (YAML, validated with `zod`):
- `title`: string (**required**)
- `date`: string, ISO date e.g. `2026-06-21` (**required**)
- `slug`: string (optional; defaults to the directory name)
- `cover`: string (optional; a filename inside this post's `images/`)
- `tags`: string[] (optional)
- `draft`: boolean (optional; hidden from the public list when `NODE_ENV=production`)
- Invalid/unparseable frontmatter ⇒ skip the post with a console warning (never crash).

Slug / filename safety (enforce on the backend writer **and** the blog reader):
- slug matches `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`
- image filename matches `^[a-z0-9._-]+$` and is not `.` or `..`
- Always `path.resolve` the final target and assert it stays under `DATA_DIR` before any fs
  op (path-traversal guard).

Images:
- In Markdown, authors reference images as `images/<file>`.
- The blog rewrites `images/<file>` → `/blog/images/<slug>/<file>` at render time and serves
  the bytes from its SSR endpoint `src/pages/images/[...path].ts`, reading
  `$DATA_DIR/posts/<slug>/images/<file>` (with the traversal guard + correct content-type).
- `cover` resolves to `/blog/images/<slug>/<cover>`.

Writes: backend is the **only** writer. Write via temp file + `fs.rename` (atomic). Update
`system-status.json` read-modify-write under a small in-process mutex, then atomic rename.
The blog/hub only ever read.

## Auth (backend)
- Password only. `ADMIN_PASSWORD_HASH` is an **scrypt** hash, format
  `scrypt:<saltHex>:<hashHex>` (see `misc/scripts/gen-password-hash.mjs`). Verify with
  `node:crypto` `scrypt` + `timingSafeEqual`. **No plaintext or extra hashing deps.**
- Session: HMAC-SHA256 signed cookie using `SESSION_SECRET` (≥32 bytes). Cookie
  `labs_session`; flags `HttpOnly`, `SameSite=Lax`, `Path=/backend`, and `Secure` when
  `NODE_ENV=production`.
- Rate-limit `POST /backend/api/login` (`express-rate-limit`).
- The backend **must not** offer process control over itself (registry excludes `backend`)
  to avoid self-lockout.

## Build / runtime conventions
- **hub, blog:** Astro `output: 'server'` + `@astrojs/node({ mode: 'standalone' })`. Start
  with `node ./dist/server/entry.mjs` (reads `HOST`, `PORT`). Pages that don't need request
  data may set `export const prerender = true`; the hub index must be SSR (live status).
- **backend/server:** TypeScript compiled to **CommonJS**, entry `backend/dist/index.js`
  (`rootDir: "server"`, `outDir: "dist"`). Dev with `tsx`. Register API routes **before** the
  static admin middleware. `app.set('trust proxy', 1)`.
- **backend/frontend:** Astro `output: 'static'`, `base: '/backend'`, `build.format: 'file'`.
  Built to `frontend/dist`, served by Express `express.static(dir, { extensions: ['html'] })`
  mounted at `/backend`. Admin pages call the JSON API at `/backend/api/...`.
- Uploads: validate by extension allowlist (`png jpg jpeg webp gif`) **and** a magic-byte
  sniff; cap size (~5 MB); write to a temp path then move under the post's `images/`.

## Env vars (see `.env.example`)
`DATA_DIR`, `HOST`, `PORT` (per app), `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `NODE_ENV`.

## Verify before you finish a system
- It builds (`npm run build`) and starts on its assigned port.
- Astro apps emit `base`-prefixed asset URLs (view-source shows `/blog/_astro/…`).
- Reader/writer changes honor the data contract above.
