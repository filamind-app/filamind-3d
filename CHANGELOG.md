# Changelog

All notable changes to FilaMind 3d are documented here. Format: `## [version]` sections (parsed by the release workflow).

## [0.1.1]

### Fixed

- **One-line installer can prompt for the sudo password.** Running `scripts/install.sh` via
  `curl … | bash` left stdin attached to the pipe, so the nginx setup failed with
  `sudo: a terminal is required to read the password`. It now reconnects the controlling terminal
  before the sudo step, so the one-liner works.

## [0.1.0]

Initial app shell, built on `@filamind-app/core`.

- **Foundation** — Vue 3 + Vite 8 + Pinia 3 + Vue Router 4 (hash) + vue-i18n 11 + Tailwind 4 + TypeScript 6, all pinned to mutually-compatible latest-stable; Node ≥ 22.13.
- **Core binding** — Pinia stores mirror the core `FilaMindSession` Observables (printer state, Klippy state, live/stale trust, capabilities, prompts) and the unified `SettingsStore` into reactive refs; the widget registry, theme tokens (3 Pharaonic + neutral light / dark), and 19-locale metadata are consumed from core (no duplication).
- **Shell** — app layout with a connection trust ribbon, an adaptive widget-host dashboard, a keyboard-driven command palette (⌘/Ctrl + K), and a unified Settings & Customization section (theme switcher — 3 Pharaonic + light / dark — and language, density / motif / reduced-motion, export / import / reset).
- **Machine control** — a control bar (Home / Pause / Resume / Cancel / Emergency-stop + a safe-mode toggle) whose mutations funnel through the core write-arbiter (refused unless live + Klippy-ready, or while safe-mode is on); E-STOP is intentionally ungated; Cancel requires a confirm; refusals surface as a global toast.
- **Klipper prompts** — a modal dialog driven by `// action:prompt_*` (focus-managed, Esc-dismissable, auto-closes if the printer drops); its buttons run their gcode through the same gated path.
- **Widgets** — Temperatures, Motion, and Print Status (bound to live printer objects), plus Print History, Job Queue, and Exclude Object (fetched via Moonraker `server.*` RPC / the `exclude_object` printer object). Each declares its own subscription set, merged with the control baseline so the session subscribes once; list widgets self-refresh when a print ends and gate their writes through the arbiter.
- **i18n** — English bundled, others lazy-loaded; the language list and RTL/direction derive from core. All 19 locale catalogs ship, with a CI key-diff gate (`npm run i18n:keydiff`) keeping every locale at parity with English.
- **PWA** — installable, offline-capable service worker, with a navigate-fallback denylist so it never shadows the same-origin Moonraker / API paths.
- **Quality** — ESLint flat config, Prettier, Vitest (component + bridge tests), and an R1 no-external-refs guard; CI runs lint + format + type-check + test + build + the guard on Node 22.
