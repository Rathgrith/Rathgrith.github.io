#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Keep Jekyll/Sass in UTF-8 mode to avoid encoding failures on macOS.
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

# Load rbenv when available so this script works even in non-interactive shells.
if [[ -d "${HOME}/.rbenv" ]]; then
  export PATH="${HOME}/.rbenv/bin:${PATH}"
  eval "$(rbenv init - bash)"
fi

if ! command -v bundle >/dev/null 2>&1; then
  echo "bundle command not found."
  echo "Run: bash scripts/setup_debug_env.sh"
  exit 1
fi

BUNDLER_VERSION="$(awk '/^BUNDLED WITH/{getline; gsub(/^ +| +$/, ""); print; exit}' Gemfile.lock)"
BUNDLE_CMD=(bundle)
if [[ -n "${BUNDLER_VERSION}" ]]; then
  if bundle "_${BUNDLER_VERSION}_" -v >/dev/null 2>&1; then
    BUNDLE_CMD=(bundle "_${BUNDLER_VERSION}_")
  fi
fi

HOST="${JEKYLL_HOST:-127.0.0.1}"
PORT="${JEKYLL_PORT:-4000}"
LIVE_RELOAD_PORT="${JEKYLL_LIVERELOAD_PORT:-35729}"

echo "Starting Jekyll on http://${HOST}:${PORT}"
"${BUNDLE_CMD[@]}" exec jekyll serve \
  --host "${HOST}" \
  --port "${PORT}" \
  --watch \
  --livereload \
  --livereload-port "${LIVE_RELOAD_PORT}" \
  --trace
