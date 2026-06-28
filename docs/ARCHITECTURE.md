# FilaMind 3d - architecture

FilaMind 3d is a thin Vue surface over `@filamind-app/core`. The core owns logic and state; the app owns presentation. This document covers that seam, how data flows from Moonraker to the screen, and how the app is built and deployed. For the user-facing overview, see the [README](../README.md).

## Stack

- **Frontend** - Vue 3.5 · Vue Router 4 (hash history) · Pinia 3 · vue-i18n 11 · Vite 8 · Tailwind 4 (CSS-first `@theme`) · TypeScript 6 (strict, with `noUncheckedIndexedAccess`) · Vitest 4 · vite-plugin-pwa. Node ≥ 22.13.
- **Backend** - a lean FastAPI host (FastAPI · uvicorn · pydantic · pydantic-settings) running on Python 3.11. No numpy / jinja / kconfig - deliberately small.
- **Shared core** - `@filamind-app/core` is a framework-agnostic package consumed from npm (or the suite workspace symlink in local dev). It provides the Moonraker client, the `FilaMindSession` orchestrator, the live/Klippy gate, the unified settings store, the themes, the cross-surface widget registry, and the 19-locale metadata.

## The core-binding seam (`frontend/src/core/`)

The app never re-implements core logic; it binds it into Vue through a handful of small modules:

- **`session.ts`** - constructs the single `MoonrakerClient` and `FilaMindSession` (the WebSocket URL is derived from env or the serving host) and exports them as singletons, plus a lightweight `connector` for one-off RPC calls.
- **`store/session.ts`** (Pinia) - subscribes to the session's framework-agnostic `Observable`s (printer objects, Klippy state, live, capabilities, prompt) for the app's lifetime and exposes them as Vue refs, plus a derived `trust` state (`live | stale | shutdown | error | offline`). Components read from here.
- **`store/settings.ts`** (Pinia) - mirrors the core `SettingsStore` into a ref; writes go straight back through core, which persists them and re-themes.
- **`store/control.ts`** + **`useWriteGuard.ts`** - the write path. Every mutation (machine control, console sends, config saves, starting a print) funnels through the core write-arbiter, which refuses unless the printer is live and Klippy is ready (or safe-mode is on). Refusals surface as a toast; the emergency stop is intentionally ungated.
- **`theme.ts`** - on every settings change, applies the Pharaonic `--fm-*` design tokens to `:root` and sets `lang` / `dir` / density / motif / reduced-motion data attributes. Three Pharaonic themes (Tutankhamun, Horus, Anubis) plus neutral light and dark.
- **`i18n.ts`** - wires vue-i18n: English is bundled; other locales lazy-load via `import.meta.glob`. The locale list, RTL flag, and direction derive from the core locale metadata. The vue-i18n compiler is bundled (not `runtimeOnly`) because messages load at runtime.
- **`registry.ts`** - re-exports the core widget registry; built-in widgets register Vue component loaders directly and declare which printer objects they subscribe to.
- **`useObservable.ts`** - a per-component helper to bind any core `Observable` to a ref, for cases the app-lifetime stores don't cover.

## Data flow

```
Moonraker  ⇄  MoonrakerClient (WS, reconnect)  →  FilaMindSession (staged init, Klippy gate)
   →  core Observables  →  Pinia mirror stores  →  Vue components
```

`live` is true only when the connection is up **and** Klippy reports `ready`, so a FIRMWARE_RESTART re-seeds the printer objects rather than showing stale data as live. Widgets each declare the printer objects they need; at boot `main.ts` merges those declarations with the control baseline (`FULL_CONTROL` + `mergeSubscriptions` from core) so the session subscribes to everything exactly once.

Settings roam across FilaMind surfaces: `roamSettings` persists theme and locale through the printer's Moonraker database, so a change made here reaches the touch screen on its next connect.

## Boot order (`frontend/src/main.ts`)

```
hydrate settings → initTheme() (apply now + on every later change) → register widgets
→ set merged subscriptions → roamSettings → detect + load locale → mount
```

`App.vue` starts the session on mount; the trust ribbon reflects connection health from then on.

## Screens and widgets

Routing is hash-history (`createWebHashHistory`) so the static bundle hosts correctly under any sub-path with no server rewrites. Each route is a lazy-loaded view:

- **Dashboard** - a widget host rendering the registered built-in widgets.
- **Files** - G-code browse / upload / print (start gated by the write guard).
- **Console** - uses a dedicated lightweight `MoonrakerClient` so tapping `notify_gcode_response` never clobbers the main data session's callbacks; sends go through the gated control store.
- **Config** - lists the config root, opens a file over the REST file channel, and saves it. Saving is gated *and* limited to root-level files, because the shared upload channel places a file by name at the root and can't preserve a subdirectory; nested files therefore open read-only with a note.
- **Hardware** - read straight from `machine.system_info` + `printer.info` + the Klipper config sections (no catalog backend): host/OS/CPU, the MCUs with chip and firmware version, and the configured components.
- **Components** (`PluginsView`) - read-only over `machine.update.status`: each managed repo / web UI / system-package set with current vs latest version, ranked modified → behind → update-available → up-to-date.
- **Setup** - a system-readiness report read from Moonraker; nothing here changes the system.
- **Settings** - theme, language, density / motif / reduced-motion, export / import / reset.

Built-in dashboard widgets (`frontend/src/widgets/index.ts`): Temperatures, Motion, and Print Status bind to live printer objects; Print History and Job Queue fetch via Moonraker `server.*` RPC; Exclude Object reads the `exclude_object` printer object. Each widget declares a `targets` list (`3d`, `screen`) so the same registry feeds both the web app and the touch surface. The widget `id` matches its i18n namespace (`widgets.<id>.*`), from which the host derives the title.

## Backend (`backend/`)

A lean FastAPI host with an application-factory `create_app()`:

- `GET /api/health` → `{ status, version }`
- `GET /api/config` → `{ app_title, moonraker_ws_url }` - runtime config the frontend can fetch at boot instead of relying on build-time env.
- `GET /` and `/assets/*` → the prebuilt `../frontend/dist`, mounted only when it exists. Because the app uses hash routing, the server only ever serves `/` (index.html) and `/assets/*`, so there is no history-mode fallback to configure.

The backend deliberately does **not** proxy Moonraker - the frontend resolves Moonraker itself (same-origin reverse proxy in the nginx path, or `VITE_MOONRAKER_WS_URL`). Settings are env-driven through pydantic-settings with the prefix `FILAMIND_` (`FILAMIND_APP_TITLE`, `FILAMIND_MOONRAKER_WS_URL`, `FILAMIND_LOG_LEVEL`). The `app/__init__.py` `__version__` feeds both `/api/health` and the FastAPI `version`. `python main.py` runs uvicorn on `0.0.0.0:8030`.

## Deploy paths

Two paths, which can coexist:

- **Agent service** (`deploy/install-agent.sh`, the recommended one-liner) - installs the backend's Python virtualenv (using piwheels on ARM so pip never compiles from source on a low-RAM host), generates `/etc/systemd/system/filamind-3d.service` with your real user and install path, enables and starts it, and appends `filamind-3d` to `~/printer_data/moonraker.asvc` so it appears as a restartable managed service. The service runs `main.py` (UI + `/api` on :8030) with `Restart=always`. `--uninstall` reverses all of it and leaves the app files. The installer runs as the normal user and elevates only the narrow `cp` / `systemctl` steps, so it also installs unattended from the suite's Setup service; it reconnects a controlling terminal for sudo only when one actually opens.
- **nginx static site** (`deploy/install.sh`) - serves the prebuilt `frontend/dist` and reverse-proxies Moonraker (REST + WebSocket) on the **same origin**, so the browser needs no CORS config and the app auto-resolves `ws://<host>:<port>/websocket`. Defaults to port 8089; `--port` and `--moonraker` override. If `frontend/dist` is missing it builds it (Node 22 + npm), but the bundle ships committed so that's only a fallback.

`scripts/install.sh` is a thin one-liner wrapper that clones or refreshes the repo and then dispatches to the two `deploy/` scripts (`install` → nginx, `agent` → the service, `uninstall` → both). For update tracking, `deploy/moonraker-update_manager.conf` documents a `[update_manager] type: git_repo` entry that runs `deploy/install-agent.sh` as its install script to refresh the venv after each pull.

### Why the prebuilt bundle is committed

The printer serves `frontend/dist` straight from git, so the host needs no Node at runtime. That makes the committed bundle load-bearing, so CI is the canonical builder: on a pull request it rebuilds and commits `frontend/dist` back to the branch; on push to main it sanity-checks that a coherent bundle is present (index.html plus its referenced entry chunk) and only warns on hash drift, because the bundler's chunk hashes are not byte-reproducible across runs (the i18n virtual modules rehash).

## Conventions

- ESLint flat config + Prettier; `npm run format:check` is a separate CI gate from lint.
- Tailwind v4 CSS-first (`@theme`), with `--fm-*` tokens mapped in `assets/styles/main.css`.
- Namespaced locale catalogs (common, control, dashboard, palette, prompt, settings, shell, widgets) under `src/locales/<lang>/`; `npm run i18n:keydiff` enforces that every locale carries exactly the English key set.
- Hash routing and `base: './'` for sub-path-portable static hosting.
- **R1 - no third-party Klipper-UI/tool names in shipped files.** Klipper and Moonraker (the platform the app integrates with) are fine; other projects are not. A guard (`scripts/check-no-external-refs.sh`, present in both `frontend/` and `backend/`) enforces this in CI.
- The backend mirrors the same conventions on the Python side: ruff (lint + format), mypy strict, pytest via the FastAPI `TestClient`.

GPL-3.0-or-later.
