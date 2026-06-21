# labs_boyaomgame

A small **mini mono-repo** powering [`labs.boyaomgame.xyz`](https://labs.boyaomgame.xyz) — a
landing page ("hub"), a Markdown blog, and an authenticated control-plane backend.
Each sub-system is independent and runs as its own process behind a reverse proxy.

---

## Repository structure rule (do not violate)

The **top level of this repo may contain only these folders**:

| Folder          | Status                          | Purpose                                            |
| --------------- | ------------------------------- | -------------------------------------------------- |
| `hub/`          | active                          | index / landing page (Astro SSR)                   |
| `blog/`         | active                          | blog reader (Astro SSR), reads `DATA_DIR`          |
| `backend/`      | active                          | authenticated control plane: API + admin UI        |
| `proxy-status/` | **reserved — do not create**    | future sub-system                                  |
| `mc-pinger/`    | **reserved — do not create**    | future sub-system                                  |
| `misc/`         | active                          | anything else that needs organizing                |

- Loose **files** at the top level are allowed (`README.md`, `CLAUDE.md`, `.gitignore`,
  `.env.example`, `ecosystem.config.cjs`, `Caddyfile`, `nginx.conf.example`).
- **No other top-level folders may be created.** `proxy-status/` and `mc-pinger/` are
  reserved and must stay absent until they are explicitly built.
- Each top-level system is a mini-mono-repo and may internally split `frontend/` and
  `server/` tiers. Single-tier systems are fine (`hub` and `blog` are frontend-only and
  read the data dir directly). The control plane uses `backend/server/` + `backend/frontend/`
  — **never** `backend/backend/`.
- The shared runtime data directory is **not** a top-level folder. It lives at `DATA_DIR`
  (default `misc/data/`, gitignored, for local dev; a mounted volume in production).
- Each system has its **own `package.json`** and is installed independently. There is **no
  workspace and no root `package.json`** — this keeps the systems decoupled.

> The same rules, plus the frozen data/auth contract, are written for agents in
> [`CLAUDE.md`](./CLAUDE.md). Read that before adding code.

---

## Architecture

```
                          labs.boyaomgame.xyz
                                  │
                        ┌─────────┴─────────┐
                        │   reverse proxy   │   Caddy (or nginx) — passes the
                        │   (Caddyfile)     │   path prefix through to each app
                        └─────────┬─────────┘
            ┌────────────────┬────┴───────────┬────────────────┐
            │ /              │ /blog          │ /backend        │
       ┌────┴────┐      ┌────┴────┐       ┌───┴─────┐
       │  hub    │      │  blog   │       │ backend │  (Express API
       │ :4321   │      │ :4322   │       │ :4323   │   + Astro admin UI)
       └────┬────┘      └────┬────┘       └───┬─────┘
            │  reads         │ reads          │ reads + WRITES
            └────────────────┴────────────────┴──────────────────┐
                                                                  │
                                                  ┌───────────────┴───────────────┐
                                                  │  DATA_DIR (shared volume)      │
                                                  │   system-status.json           │
                                                  │   posts/<slug>/index.md + images│
                                                  └────────────────────────────────┘
```

- **hub** (`/`) — Astro SSR landing page; its index shows the **live status** of each
  sub-system (online / maintenance) by reading `system-status.json`.
- **blog** (`/blog`) — Astro SSR; lists and renders Markdown posts read from `DATA_DIR`.
- **backend** (`/backend`) — Express control plane behind a password login. Two jobs:
  1. **Blog editor** — write/edit/delete Markdown posts and upload images (writes `DATA_DIR`).
  2. **System control** — per sub-system: a soft **maintenance toggle** *and* real **PM2**
     start / stop / restart. (The backend cannot control its own process, by design.)

All three run as **PM2** processes (`labs-hub`, `labs-blog`, `labs-backend`). The reverse
proxy keeps the URL prefix and each Astro app owns its `base`, so assets resolve as
`/blog/_astro/…` etc. without collisions.

---

## Local development

Requirements: **Node ≥ 20**, `npm`, and (for the full integration test) `pm2` and `caddy`.

```bash
# 1. Install + build each system (independent packages, no workspace)
( cd hub && npm install && npm run build )
( cd blog && npm install && npm run build )
( cd backend && npm install && npm run build )

# 2. Configure the backend secrets
node misc/scripts/gen-password-hash.mjs 'choose-a-password'   # -> ADMIN_PASSWORD_HASH
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # -> SESSION_SECRET
#   put both into backend/.env (see .env.example)

# 3a. Fast dev loop (each app standalone)
( cd hub && npm run dev )       # http://localhost:4321/
( cd blog && npm run dev )      # http://localhost:4322/blog
( cd backend && npm run dev )   # http://localhost:4323/backend

# 3b. Prod-like, all together
export DATA_DIR="$PWD/misc/data"
pm2 start ecosystem.config.cjs   # labs-hub / labs-blog / labs-backend
caddy run --config ./Caddyfile   # then open http://localhost/ , /blog , /backend
```

> Astro's `base` also applies in dev, so the blog dev server lives at
> `http://localhost:4322/blog` (not `/`). This is expected.

---

## Deployment (self-hosted)

This repo ships the configuration but does **not** provision a server. On your host:

1. Clone the repo and `npm install && npm run build` each system.
2. Provide `DATA_DIR` (a persistent volume), `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET`
   to the `labs-backend` process (via `ecosystem.config.cjs` env or the host environment).
3. `pm2 start ecosystem.config.cjs` and `pm2 save` (+ `pm2 startup` for boot persistence).
4. Point your reverse proxy at the three ports using the included `Caddyfile`
   (recommended; automatic HTTPS) or `nginx.conf.example`.
5. `backend` must run as the **same OS user / `PM2_HOME`** as the other processes and have
   `pm2` on its `PATH`, or its start/stop/restart controls will not work.

---

## Layout reference

```
labs_boyaomgame/
├── README.md  CLAUDE.md  .gitignore  .env.example
├── ecosystem.config.cjs  Caddyfile  nginx.conf.example
├── hub/        # Astro SSR landing (base '/')
├── blog/       # Astro SSR blog reader (base '/blog')
├── backend/    # Express API (server/) + Astro admin UI (frontend/)
└── misc/
    ├── data/   # DATA_DIR for local dev (gitignored): system-status.json, posts/<slug>/…
    └── scripts/# gen-password-hash.mjs, dev-all.sh
```
