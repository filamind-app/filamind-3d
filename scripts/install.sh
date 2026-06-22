#!/usr/bin/env bash
# FilaMind 3d - one-line installer for a Klipper / Moonraker host.
#
# Install (run as your normal printer user; it calls sudo where needed):
#   curl -fsSL https://raw.githubusercontent.com/filamind-app/filamind-3d/main/scripts/install.sh | bash
#
# Uninstall:
#   curl -fsSL https://raw.githubusercontent.com/filamind-app/filamind-3d/main/scripts/install.sh | bash -s -- uninstall
#
# From a clone (e.g. ~/filamind-3d):
#   bash scripts/install.sh [install|uninstall|update] [--port N] [--moonraker host:port]
#
# The UI ships pre-built in frontend/dist, so NO Node is needed on the printer: this clones the
# repo (or updates it) and points nginx at the committed bundle with a same-origin Moonraker proxy.
# Re-runnable.
set -euo pipefail

REPO="${FILAMIND_3D_REPO:-https://github.com/filamind-app/filamind-3d.git}"
APP="${FILAMIND_3D_DIR:-$HOME/filamind-3d}"

CMD="install"
case "${1:-}" in
  install | uninstall | update)
    CMD="$1"
    shift
    ;;
esac

info() { printf '\n\033[1;33m==>\033[0m %s\n' "$*"; }

# If this script is on disk (run from a clone), use that clone; otherwise (curl | bash) clone it.
SELF="${BASH_SOURCE[0]:-}"
if [ -n "$SELF" ] && [ -f "$SELF" ]; then
  APP="$(cd "$(dirname "$SELF")/.." && pwd)"
elif [ ! -d "$APP/.git" ]; then
  info "Cloning FilaMind 3d -> $APP"
  command -v git >/dev/null || {
    echo "git not found; install git first." >&2
    exit 1
  }
  git clone --depth 1 "$REPO" "$APP"
fi

if [ "$CMD" = update ]; then
  info "Updating FilaMind 3d"
  git -C "$APP" pull --ff-only
  CMD=install
fi

if [ "$CMD" = uninstall ]; then
  info "Removing FilaMind 3d"
  sudo bash "$APP/deploy/install.sh" --uninstall
  exit 0
fi

info "Installing FilaMind 3d (serving the prebuilt UI via nginx)"
sudo bash "$APP/deploy/install.sh" "$@"
