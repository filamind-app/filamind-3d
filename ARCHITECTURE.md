# FilaMind 3d - architecture

The app is a thin Vue surface over `@filamind-app/core`. Core owns logic and state; the app owns presentation.

## The core-binding seam (`src/core/`)
- **`session.ts`** - constructs the one `MoonrakerClient` + `FilaMindSession` (URL derived from env/host) and exports the singletons.
- **`store/session.ts`** (Pinia) - subscribes to the session's framework-agnostic `Observable`s (printer objects, Klippy state, live, capabilities, prompt) for the app lifetime and exposes them as Vue refs, plus a derived `trust` state (`live | stale | shutdown | error | offline`). Components read from here.
- **`store/settings.ts`** (Pinia) - mirrors the core `SettingsStore` into a ref; writes go straight back through core, which persists and re-themes.
- **`theme.ts`** - on every settings change, applies the Pharaonic `--fm-*` tokens to `:root` and sets `lang`/`dir`/density/motif/reduced data attributes.
- **`i18n.ts`** - wires vue-i18n: English bundled, others lazy via `import.meta.glob`; the locale list, RTL, and `shippedLocales` derive from core. The vue-i18n compiler is bundled (not `runtimeOnly`) because messages load at runtime.
- **`registry.ts`** - re-exports the core widget registry; widgets register Vue component loaders directly.
- **`useObservable.ts`** - per-component helper to bind any core `Observable` to a ref (the stores cover the app-lifetime singletons).

## Data flow
```
Moonraker  ⇄  MoonrakerClient (WS, reconnect)  →  FilaMindSession (staged init, Klippy gate)
   →  core Observables  →  Pinia mirror stores  →  Vue components
```
`live` is true only when connected AND Klippy is `ready`, so a FIRMWARE_RESTART re-seeds rather than showing
stale data as live. Widgets declare the printer objects they need; `main.ts` merges those with the control
baseline (`mergeSubscriptions` from core) so the session subscribes once.

## Boot order (`main.ts`)
hydrate settings → `initTheme()` (apply now + on change) → register widgets → set merged subscriptions →
detect + load locale → mount. `App.vue` then starts the session on mount; the trust ribbon reflects health.

## Conventions
Mirrors FilaMind flow: ESLint flat config + Prettier, Tailwind v4 CSS-first, namespaced locale catalogs, hash
routing for sub-path hosting, `base: './'` for portability. R1: no third-party Klipper-UI/tool names in shipped
files (guard in CI).
