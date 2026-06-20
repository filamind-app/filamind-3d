#!/usr/bin/env bash
# R1 guard: shipped code must not name any analyzed third-party project as a design/code source.
# Klipper + Moonraker (platform) and Moonraker component names (spoolman, webcams, …) are allowed.
set -euo pipefail

# Analyzed UI/tool project names + attribution phrases that must never appear in shipped files.
PATTERN='mainsail|fluidd|octoprint|octoscreen|octodash|duetwebcontrol|guppyscreen|klipperscreen|klipper-touch|mobileraker|kiauh|ported from|inspired by|fork of'

# Scan the whole shipped surface, not just src/ (index.html, build config, manifest, locales…).
TARGETS=(src index.html vite.config.ts package.json env.d.ts)

if grep -rniE "$PATTERN" "${TARGETS[@]}" 2>/dev/null; then
  echo "::error::R1 violation — external-project reference found (see matches above)."
  exit 1
fi
echo "R1 OK — no external-project references in the shipped surface."
