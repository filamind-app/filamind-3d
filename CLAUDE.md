# Working on FilaMind 3d

FilaMind 3d is a web control UI for Klipper / Moonraker served from the printer itself: a Vue 3 +
Vite single-page app talking directly to Moonraker over REST and a reconnecting WebSocket, with a
small FastAPI host serving the prebuilt UI and a thin `/api` seam.

It runs two ways — as a static site behind nginx, or as an **agent**: a managed systemd service on
port 8030 that registers itself with Moonraker so it can be started, stopped and restarted from the
panel.

The app is **experimental** and says so in its README, as are the FilaMind Flow widgets it unlocks.

## The core binding

Everything reactive and stateful — the Moonraker client, the session orchestrator, the live/stale
gate, the settings store, the themes, the widget registry, the locale metadata — comes from
`@filamind-app/core`, shared across the suite. **This app binds that core into Vue; it does not
re-implement it.** If behaviour is missing, fix it in core and consume it here rather than forking
the logic locally.

## Before you push

```bash
# from the suite workspace root: npm install   (links @filamind-app/core)
cd frontend
npm run type-check && npm run lint && npm test && npm run i18n:keydiff && npm run build
```

The 19 locales are held at parity with `en` by the key-diff gate — a missing key fails the build
rather than shipping. The backend has its own loop: ruff, mypy, pytest.

Point it at a printer with `MOONRAKER_HTTP=http://<printer>:7125 npm run dev`.

## Shipping

Every shipped PR bumps the version and adds a CHANGELOG entry, then pushes a `vX.Y.Z` tag.
Documentation moves in the same PR: README, `backend/README.md`, DEPLOY, CHANGELOG, and ARCHITECTURE
if the structure moved. Work consolidates into `main`, merged manually once CI is green
(`gh pr merge --rebase --delete-branch`) — never GitHub auto-merge.

The committed frontend bundle is rebuilt by CI when it drifts, and that rebuild commit carries
`[skip ci]`, which can both mask a failing check and skip the release workflow on a tag. Confirm with
`gh run list --branch <b> --json workflowName,conclusion` and publish by hand if needed.

## Rules

- Do not present FilaMind as derived from, ported from, inspired by, or a fork of another project,
  in code or in commit messages, PR bodies and issue comments. Naming ecosystem projects the
  software genuinely integrates with — Klipper, Moonraker, the web UIs it sits alongside — is normal
  and expected; GPL attribution for vendored code is required.
- Commit messages, PR bodies and issue comments are purely technical English, with no team-chat
  content.
- Only the three maintainers listed in the README may appear as commit authors. No
  `Co-Authored-By`, no tool-attribution trailers.
- **Never close a user's issue**, even after fixing it. Reply as a human maintainer with the cause,
  the change and the version, then leave it open until the reporter confirms.
- **Never hand an end user a shell command.** Missing host dependencies are installed by the
  install/update flow.
- Machine control and config writes go through the safety gate: refused unless the printer is live
  and Klippy is ready, refusals surface as a toast, destructive actions ask first, and the emergency
  stop always works.

Maintainers: the full handbook and the current handoff live in the private
`filamind-app/filamind-internal` repo.
