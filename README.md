# FilaMind 3d

A modern web control UI for Klipper / Moonraker, built on **`@filamind-app/core`**. Part of the FilaMind suite
(3d web · screen touch · flow). This repo is the **web control app** — the shell plus the built-in control
and print-management widgets, on a lean FastAPI host.

[![CI](https://github.com/filamind-app/filamind-3d/actions/workflows/ci.yml/badge.svg)](https://github.com/filamind-app/filamind-3d/actions/workflows/ci.yml)
[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-111111.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3-111111?logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Klipper](https://img.shields.io/badge/Klipper-compatible-111111)](https://www.klipper3d.org)
[![Moonraker](https://img.shields.io/badge/Moonraker-API-111111)](https://moonraker.readthedocs.io)

## Stack
Vue 3.5 · Vue Router 4 (hash history) · Pinia 3 · vue-i18n 11 · Vite 8 · Tailwind 4 (CSS-first `@theme`) ·
TypeScript 6 (strict + `noUncheckedIndexedAccess`) · Vitest 4 · vite-plugin-pwa. Node ≥ 22.13.

Everything reactive/stateful comes from `@filamind-app/core` (framework-agnostic): the Moonraker client, the
`FilaMindSession` orchestrator, the Klippy-aware live/stale gate, the unified settings store, the exclusive
Pharaonic themes (`--fm-*` tokens), the cross-surface widget registry, and the 19-locale metadata. The app
binds those into Vue — it does **not** re-implement them.

## What the shell gives you
- **Trust ribbon** — live / reconnecting / shutdown / offline, driven by the core live+Klippy gate (never shows stale data as live).
- **Adaptive dashboard** — a widget host rendering the registered widgets; ships Temperatures, Motion, Print Status, Print History, Job Queue, and Exclude Object.
- **Machine control** — Home / Pause / Resume / Cancel / Emergency-stop + a safe-mode toggle, gated through the core write-arbiter (refused unless live + Klippy-ready, or in safe-mode); E-STOP is ungated, Cancel confirms, refusals show as a toast.
- **Klipper prompts** — a focus-managed modal driven by `// action:prompt_*`; its buttons run gcode through the same gated path.
- **Command palette (⌘/Ctrl + K)** — navigate, cycle theme, home, emergency-stop; keyboard-driven, focus-trapped, screen-reader labelled.
- **Settings & Customization** — one section: theme switcher (Tutankhamun · Horus · Anubis), language switcher, density / motif / reduced-motion, and export / import / reset. Persisted to localStorage and applied instantly.
- **i18n** — English bundled, others lazy; the language list, RTL, and direction come from the core locale meta. All 19 locales ship now — a CI key-diff gate (`npm run i18n:keydiff`) keeps every catalog at parity with English.
- **PWA** — installable, offline-capable service worker.

## Layout
```
frontend/
  src/
    core/          # the bridge to @filamind-app/core: session.ts, settings.ts, theme.ts, i18n.ts, registry.ts,
                   #   useObservable.ts, store/{session,settings}.ts (Pinia mirrors of core Observables)
    components/    # layout/ (AppShell) · system/ (TrustRibbon, CommandPalette) · settings/ · dashboard/
    views/         # DashboardView, SettingsView
    widgets/       # built-in widgets (each registers into the core registry + declares its subscriptions)
    locales/       # 19 locale folders, namespaced catalogs (common, control, dashboard, palette, prompt, settings, shell, widgets)
    router/ · assets/styles/main.css (Tailwind v4 + --fm-* token mapping)
backend/           # a lean FastAPI host (the app talks to Moonraker directly via core; the host adds its own routes)
```

## Develop
```bash
# from the suite root (workspace): npm install  — links @filamind-app/core
cd frontend
npm run dev            # Vite dev server (proxies Moonraker; set MOONRAKER_HTTP to your printer)
npm run type-check     # vue-tsc
npm run lint           # eslint (flat config)
npm test               # vitest
npm run i18n:keydiff   # every locale must carry exactly the en key set
npm run build          # type-check + vite build (+ PWA)
```
Point it at a printer with `MOONRAKER_HTTP=http://<printer>:7125 npm run dev`, or set `VITE_MOONRAKER_WS_URL`.

## Conventions
Mirrors the FilaMind flow repo conventions (ESLint flat config, Prettier, Tailwind v4 CSS-first, namespaced
locale catalogs, CI). Shipped code names no third-party Klipper UI/tool project (Klipper + Moonraker, the
platform, are fine); `scripts/check-no-external-refs.sh` enforces it in CI. GPL-3.0-or-later.

## Status
Shell + machine control + prompts + print-management widgets (history / queue / exclude-object) + the lean
FastAPI backend — all complete and green (lint · type-check · test · build · PWA + ruff/mypy/pytest), each
adversarially reviewed. Published alongside the suite's other repos — `filamind-screen` (Tauri touch) and `filamind-flow`.

## Credits

Built and maintained by the DeltaFabs team:

- abdelmonem awad - <eg2@live.com>
- Ahmed bebars - <Ahmedbebars1@gmail.com>
- Kareem Salama - <Golden.kiko@gmail.com>

## License

[GPL-3.0-or-later](LICENSE) © 2026 DeltaFabs team.
