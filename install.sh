#!/bin/bash
# install.sh - install Node dependencies for this module on the device.
# Run automatically by smartmirror-automation/system/module-installer.sh after clone
# (the universal installer does not run npm install itself).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
if command -v npm >/dev/null 2>&1; then
  echo "[install] smartmirror-module-OnSpotify: installing Node dependencies..."
  npm install --production --no-audit --no-fund
else
  echo "[install] npm not found; skipping dependency install" >&2
fi
