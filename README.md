<div align="center">

# FilaMind 3d

A modern web control UI for Klipper and Moonraker - a clean dashboard, machine control,
and the everyday print-management screens, served from the printer itself.

**Built by Egyptian makers, for world makers. Happy printing.** 🇪🇬

A small-team hobby project, built and tested on real printers. The code is all here to read.

[![Support on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/I2I119XEIV)

[![Status: experimental](https://img.shields.io/badge/status-experimental-E8A317)](#status-experimental)
[![CI](https://github.com/filamind-app/filamind-3d/actions/workflows/ci.yml/badge.svg)](https://github.com/filamind-app/filamind-3d/actions/workflows/ci.yml)
[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-111111.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3-111111?logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Klipper](https://img.shields.io/badge/Klipper-compatible-111111)](https://www.klipper3d.org)
[![Moonraker](https://img.shields.io/badge/Moonraker-API-111111)](https://moonraker.readthedocs.io)

[Install](#install) · [Uninstall](#uninstall) · [Screens](#screens) · [Tested on real printers](#tested-on-real-printers) · [Languages](#languages) · [Develop](#develop) · [Docs](#documentation) · [Support](#support)

</div>

## Status: experimental

> [!WARNING]
> **FilaMind 3d is under active development and research.**
> We are still shaping it toward an interface that stays light and quick while being genuinely
> enjoyable to use - so this app, and every feature it unlocks elsewhere in FilaMind, will keep
> changing between releases. Treat it as a preview rather than a settled product: expect rough
> edges, keep a known-good UI installed alongside it, and please tell us what feels off.
> Suggestions and improvement ideas are genuinely welcome - open an issue any time.

FilaMind 3d is a single-page control UI that talks directly to Moonraker over REST and a reconnecting WebSocket. The browser does most of the work, so it stays light on the printer host. It can run two ways: as a static site behind nginx, or as a small **agent** - a managed systemd service that serves both the UI and a tiny API on its own port, registers with Moonraker, and can be started, stopped, and restarted from the panel.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/filamind-app/filamind-3d/main/deploy/install-agent.sh | bash
```

This installs the FilaMind 3d **agent**: a systemd service that serves the prebuilt UI and its API on port **8030**, sets up its own Python virtualenv, and registers itself with Moonraker's managed services so it shows up as a restartable service. It runs as your normal printer user and elevates only the few steps that need it (so it needs sudo, but no full-root shell), and you can re-run it any time to update or repair the install. The UI ships prebuilt, so no Node is needed on the printer.

Prefer a plain static site instead of a service? `deploy/install.sh` serves the same UI behind nginx with a same-origin Moonraker proxy - see [DEPLOY.md](DEPLOY.md).

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/filamind-app/filamind-3d/main/deploy/install-agent.sh | bash -s -- --uninstall
```

This stops and removes the agent service and deregisters it from Moonraker, while leaving the app files in place. (If you cloned the repo, `bash deploy/install-agent.sh --uninstall` does the same thing.)

## Screens

FilaMind 3d is organized as a handful of focused screens, reached from the app shell:

| Screen | What it does |
| ------ | ------------ |
| **Dashboard** | An adaptive widget host: Temperatures, Motion, Print Status, Print History, Job Queue, and Exclude Object, all live from the printer |
| **Files** | Browse the printer's G-code files, upload new ones, and start a print |
| **Console** | Send G-code and watch Klipper's responses in real time |
| **Config** | Browse and safely edit your Klipper / Moonraker config files |
| **Hardware** | A read-only picture of this machine: host, MCUs and firmware, and the configured steppers, drivers, heaters, sensors, and fans |
| **Components** | Installed components and their update status, read from Moonraker's update manager |
| **Setup** | A live system-readiness check of the host - OS, Python, CPU, memory, free disk, and that Klipper and Moonraker are up |
| **Settings** | Theme switcher, language switcher, density / motif / reduced-motion, and export / import / reset |

Across every screen, machine control (Home / Pause / Resume / Cancel / Emergency-stop, plus a safe-mode toggle) and any config save run through one safety gate: a write is refused unless the printer is live and Klippy is ready, refusals surface as a toast, Cancel asks first, and the emergency stop always works. A command palette (⌘/Ctrl + K) drives navigation, theme, homing, and the emergency stop from the keyboard.

## Tested on real printers

FilaMind 3d is tested on two machines that disagree on almost everything that matters to a control panel. The first is a Sovol SV08: an STM32F103 mainboard, TMC2209 drivers over UART, a USB toolhead, and a BTT CB1 host. The second is a Voron-class CoreXY: an STM32H723 mainboard, six TMC5160 drivers on a shared software-SPI bus, a CAN toolhead, and a Raspberry Pi 4. The trust ribbon never shows stale data as live: it goes green only when the connection is up *and* Klippy is ready, so a FIRMWARE_RESTART re-seeds rather than freezing on old numbers.

## How it's built

The frontend is a Vue 3 and Vite single-page app. Everything reactive and stateful - the Moonraker client, the session orchestrator, the live/stale gate, the settings store, the themes, the widget registry, and the locale metadata - comes from `@filamind-app/core`, a framework-agnostic package shared across the FilaMind suite. The app binds that core into Vue; it does not re-implement it. A small FastAPI host serves the prebuilt UI and a tiny `/api` seam (health and runtime config) and is what the agent service runs. The UI ships in [19 languages](#languages), including right-to-left Arabic, with switchable themes. For the full picture, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Languages

The whole interface is translated into **19 languages** - every screen and widget, not just the chrome. Pick one from the 🌐 menu; your choice is remembered, and on first run the app matches your browser's language. A CI key-diff gate keeps every catalog at parity with English.

| | | | |
| --- | --- | --- | --- |
| English | Español | 简体中文 (Simplified Chinese) | 日本語 (Japanese) |
| العربية (Arabic, RTL) | Français | 繁體中文 (Traditional Chinese) | 한국어 (Korean) |
| Deutsch (German) | Русский (Russian) | Português (Brasil) | Tiếng Việt (Vietnamese) |
| Italiano | Nederlands (Dutch) | Polski (Polish) | Bahasa Indonesia |
| Türkçe (Turkish) | Українська (Ukrainian) | हिन्दी (Hindi) | |

Each language is a drop-in catalog folder, so adding another needs no code changes.

## Develop

```bash
# from the suite workspace root: npm install   (links @filamind-app/core)
cd frontend
npm run dev            # Vite dev server
npm run type-check     # vue-tsc
npm run lint           # eslint (flat config)
npm test               # vitest
npm run i18n:keydiff   # every locale must carry exactly the en key set
npm run build          # type-check + vite build (+ PWA)
```

Point it at a printer with `MOONRAKER_HTTP=http://<printer>:7125 npm run dev`, or set `VITE_MOONRAKER_WS_URL`. The backend has its own dev loop (ruff, mypy, pytest, `python main.py` on :8030) - see [backend/README.md](backend/README.md).

## Documentation

| Document | What's inside |
| -------- | ------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Design, the core-binding seam, data flow, and build/deploy internals |
| [DEPLOY.md](DEPLOY.md) | Running on a printer: the agent service and the nginx static site |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [backend/README.md](backend/README.md) | The FastAPI host, its `/api` endpoints, and `FILAMIND_*` settings |
| [SECURITY.md](SECURITY.md) | How to report a vulnerability |

## Support

FilaMind 3d is free and open source, built and maintained in spare time. If it saved you a session, or you just want to see it grow, a coffee helps keep the work going. Code, data, and ideas are just as welcome.

<div align="center">

[![Support on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/I2I119XEIV)

</div>

## Credits

Built and maintained by the DeltaFabs team:

- Abdelmonem Awad - <eg2@live.com>
- Ahmed Bebars - <Ahmedbebars1@gmail.com>
- Kareem Salama - <Golden.kiko@gmail.com>

## License

[GPL-3.0-or-later](LICENSE) © 2026 DeltaFabs team.
