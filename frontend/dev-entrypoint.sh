#!/bin/sh
set -eu

lock_hash="$(sha256sum package-lock.json | awk '{ print $1 }')"
lock_marker="node_modules/.woorilog-package-lock"

if [ ! -f "$lock_marker" ] || [ "$(cat "$lock_marker")" != "$lock_hash" ]; then
  npm ci
  printf '%s\n' "$lock_hash" > "$lock_marker"
fi

exec npm run dev -- --host 0.0.0.0
