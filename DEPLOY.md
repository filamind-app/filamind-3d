# Deploy & test FilaMind 3d on a printer

FilaMind 3d is a built SPA that talks to **Moonraker** directly over a WebSocket; `@filamind-app/core`
is bundled into the build, so the printer needs **no Node/npm at runtime** - only a way to serve the
files. There are two ways to run it.

## Path A - nginx on the printer host (recommended)

nginx serves the SPA and reverse-proxies Moonraker on the **same origin**, so the browser needs no
CORS config and the app auto-resolves `ws://<host>:<port>/websocket`.

```bash
# on the printer (Debian/Ubuntu/Raspberry Pi OS), as a sudo-capable user:
sudo bash deploy/install.sh --port 8089 --moonraker 127.0.0.1:7125
# → open http://<printer-ip>:8089/
sudo bash deploy/install.sh --uninstall   # to remove
```

If `frontend/dist` isn't present the script builds it (needs Node 22 + npm). To ship a prebuilt
bundle instead, run `npm ci && npm run build` in `frontend/` on any machine and copy `frontend/dist`
to the printer first.

## Path B - quick serve (no nginx)

Build with the printer's Moonraker baked in, then serve `dist/` from anywhere on the LAN:

```bash
cd frontend
VITE_MOONRAKER_WS_URL=ws://<printer-ip>:7125/websocket npm run build
npm run preview            # or: python3 -m http.server -d dist 8089
```

Because this serves from a different origin than Moonraker, add the origin to the printer's
`moonraker.conf` and restart Moonraker:

```ini
[authorization]
cors_domains:
  *://<serving-host>:<port>
trusted_clients:
  192.168.0.0/16
```

## Preliminary test checklist

1. Open the app - the **trust ribbon** should go **Live** (green) once Klipper is ready.
2. **Telemetry** renders (Temperatures / Motion / Print Status update in real time).
3. **Klipper prompts** (`// action:prompt_*`) show as a focus-managed modal.
4. **Gated control**: Home / Pause / Resume / Cancel are enabled only when live + Klippy-ready;
   E-STOP always works; refusals show a toast. (Test on an idle printer.)
5. **Settings roam**: change theme/locale here; another FilaMind surface picks it up on (re)connect.
6. **Remote control** (with FilaMind screen running on the same Moonraker): ⌘K → "Printer screen →
   Status/Control/Settings" / "Locate" steers the screen.

## Notes

- The lean FastAPI backend (`backend/`) is **optional** - it serves the SPA + `/api/health` +
  `/api/config`, but the frontend resolves Moonraker itself, so Path A/B don't need it for a test.
- For a permanent install, register a Moonraker `[update_manager]` `web` entry pointing at this repo.
