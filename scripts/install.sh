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
#   bash scripts/install.sh agent        # install the managed backend service ("agent") on :8030
#
# The UI ships pre-built in frontend/dist, so NO Node is needed on the printer: this clones the
# repo (or updates it) and points nginx at the committed bundle with a same-origin Moonraker proxy.
# Re-runnable.
set -euo pipefail

REPO="${FILAMIND_3D_REPO:-https://github.com/filamind-app/filamind-3d.git}"
APP="${FILAMIND_3D_DIR:-$HOME/filamind-3d}"

CMD="install"
case "${1:-}" in
  install | uninstall | update | agent)
    CMD="$1"
    shift
    ;;
esac

info() { printf '\n\033[1;33m==>\033[0m %s\n' "$*"; }

# If this script is on disk (run from a clone), use that clone; otherwise (curl | bash, or the Setup
# widget's `bash -c`) clone it - and if a clone already EXISTS, refresh it to current main first.
# Reusing a stale pre-existing clone would run an outdated deploy/install.sh (the old one had a
# `require_root` gate that prints "Run with sudo." and exits), so install kept failing until the host
# was re-cloned by hand. Hard-reset (not pull --ff-only) so a diverged/dirty checkout still updates.
SELF="${BASH_SOURCE[0]:-}"
if [ -n "$SELF" ] && [ -f "$SELF" ]; then
  APP="$(cd "$(dirname "$SELF")/.." && pwd)"
  if [ "$CMD" = update ]; then
    info "Updating FilaMind 3d"
    git -C "$APP" pull --ff-only
  fi
else
  command -v git >/dev/null || {
    echo "git not found; install git first." >&2
    exit 1
  }
  if [ ! -d "$APP/.git" ]; then
    info "Cloning FilaMind 3d -> $APP"
    # Full clone (NOT --depth 1) so tags come too: Moonraker's update_manager needs them to show a
    # real version instead of "v0.0.0-...-inferred".
    git clone "$REPO" "$APP"
  else
    info "Refreshing FilaMind 3d -> $APP"
    # Unshallow a legacy --depth 1 clone + fetch tags, then hard-reset to current main.
    [ -f "$APP/.git/shallow" ] && git -C "$APP" fetch --unshallow --tags origin 2>/dev/null || true
    git -C "$APP" fetch --tags --force origin && git -C "$APP" reset --hard origin/main
  fi
fi

# 'update' is handled above (refresh); everything past here is the normal install.
[ "$CMD" = update ] && CMD=install

# When invoked via `curl | bash`, stdin is the pipe (not a terminal), so the sudo calls below can't
# prompt for a password. Reconnect the controlling terminal when one is actually attached. Testing
# `[ -e /dev/tty ]` is not enough: in a service context (no controlling terminal) the device node
# still exists but opening it fails, and a bare `exec </dev/tty` would abort the whole script. Probe
# that it opens first; if it does not (a headless run, e.g. from the Setup widget) fall through and
# let sudo print its own clear error instead of dying on a cryptic /dev/tty failure.
if [ ! -t 0 ] && (exec </dev/tty) 2>/dev/null; then exec </dev/tty; fi

# The agent (managed backend service) is a separate, additive install path.
if [ "$CMD" = agent ]; then
  info "Installing the FilaMind 3d agent (managed backend service on :8030)"
  bash "$APP/deploy/install-agent.sh" "$@"
  exit 0
fi

if [ "$CMD" = uninstall ]; then
  info "Removing FilaMind 3d (agent service + nginx site)"
  # deploy/*.sh run as this user and elevate only the narrow steps (cp/systemctl) themselves,
  # so no full-root `sudo bash` - this lets the FilaMind flow Setup service manage it passwordless.
  bash "$APP/deploy/install-agent.sh" --uninstall || true
  bash "$APP/deploy/install.sh" --uninstall
  exit 0
fi

info "Installing FilaMind 3d (serving the prebuilt UI via nginx)"
bash "$APP/deploy/install.sh" "$@"
