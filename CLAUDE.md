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

## When you finish work here — update the team repo

FilaMind's working state lives in the private `filamind-app/filamind-internal` repo: the handbook,
the research corpus, and the handoff that records what shipped and what is still open. Several
sessions work on FilaMind in parallel, on different machines and at different times, and that repo
is how they stay in agreement about what is true.

**Updating it is part of finishing a piece of work, not an optional extra.** A later session cannot
reconstruct what you knew. Work is not finished when the code ships; it is finished when that repo
says the code shipped.

If you do not have it (it is private — you need access to the `filamind-app` account):

```bash
git clone https://github.com/filamind-app/filamind-internal.git
```

`handbook/sync-protocol.md` in that repo is the full contract. The short version:

- **`git pull --ff-only` first.** Assume those files are newer than your memory of them.
- **Verify before you record.** Check `gh release list`, `gh issue list`, `gh pr list` and
  `git log origin/main` rather than writing down what you remember. If a file there contradicts
  reality, fix it and say so in the commit — a wrong state table is worse than a missing one,
  because the next session acts on it.
- **Released something** → a changelog line and the new version in the newest file in `handoffs/`.
- **Answered, fixed or closed an issue** → update its row in that handoff's open-items table, saying
  exactly what is now being waited on and by whom.
- **Learned something the hard way** → a numbered rule in `handbook/rules.md` **with the cost
  attached**, or a trap in `handbook/ci-and-release.md` if it is mechanical.
- **Ended a stretch of work, or handing over** → write a **new dated handoff**; never edit an old one
  to make it current.
- **Never invent state.** If you did not check whether CI passed, write "not verified", not a guess.

Do not record work in progress, an unmerged PR you are still iterating on, or an intention. That repo
records what is true, not what is planned.
