#!/usr/bin/env bash
# Convenience: run all three systems in dev mode at once.
# Each app's Astro `base` applies in dev too, so open:
#   hub      -> http://localhost:4321/
#   blog     -> http://localhost:4322/blog
#   backend  -> http://localhost:4323/backend
#
# Ctrl-C stops all of them. For a prod-like run use `pm2 start ecosystem.config.cjs`.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export DATA_DIR="${DATA_DIR:-$REPO_ROOT/misc/data}"

echo "DATA_DIR=$DATA_DIR"

pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

( cd "$REPO_ROOT/hub"     && npm run dev ) & pids+=($!)
( cd "$REPO_ROOT/blog"    && npm run dev ) & pids+=($!)
( cd "$REPO_ROOT/backend" && npm run dev ) & pids+=($!)

wait
