#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

RUBY_VERSION_FILE="${ROOT_DIR}/.ruby-version"
if [[ ! -f "${RUBY_VERSION_FILE}" ]]; then
  echo "2.7.8" > "${RUBY_VERSION_FILE}"
fi
RUBY_VERSION="$(tr -d '[:space:]' < "${RUBY_VERSION_FILE}")"
BUNDLER_VERSION="$(awk '/^BUNDLED WITH/{getline; gsub(/^ +| +$/, ""); print; exit}' Gemfile.lock)"

if [[ -z "${BUNDLER_VERSION}" ]]; then
  BUNDLER_VERSION="2.2.19"
fi

if ! xcode-select -p >/dev/null 2>&1; then
  echo "[setup] Xcode Command Line Tools are required."
  echo "Run: xcode-select --install"
  exit 1
fi

if [[ ! -d "${HOME}/.rbenv" ]]; then
  echo "[setup] Installing rbenv..."
  git clone https://github.com/rbenv/rbenv.git "${HOME}/.rbenv"
fi

mkdir -p "${HOME}/.rbenv/plugins"
if [[ ! -d "${HOME}/.rbenv/plugins/ruby-build" ]]; then
  echo "[setup] Installing ruby-build..."
  git clone https://github.com/rbenv/ruby-build.git "${HOME}/.rbenv/plugins/ruby-build"
fi

export PATH="${HOME}/.rbenv/bin:${PATH}"
eval "$(rbenv init - bash)"

echo "[setup] Ensuring Ruby ${RUBY_VERSION}..."
rbenv install -s "${RUBY_VERSION}"
rbenv local "${RUBY_VERSION}"

if gem list -i bundler -v "${BUNDLER_VERSION}" >/dev/null 2>&1; then
  echo "[setup] Bundler ${BUNDLER_VERSION} already installed."
else
  echo "[setup] Installing bundler ${BUNDLER_VERSION}..."
  gem install bundler -v "${BUNDLER_VERSION}"
fi

echo "[setup] Installing gems into ./vendor/bundle..."
bundle "_${BUNDLER_VERSION}_" config set --local path vendor/bundle
bundle "_${BUNDLER_VERSION}_" config set --local disable_shared_gems true
bundle "_${BUNDLER_VERSION}_" install

echo ""
echo "Debug environment is ready."
echo "Run: bash run_server.sh"
