// The single MoonrakerClient + FilaMindSession for the app, built from @filamind-app/core.
// All printer state, the Klippy lifecycle, and the live/stale gate live in core; this
// module just wires the connection URL and identity, then exposes the singletons.

import { MoonrakerClient, FilaMindSession, FULL_CONTROL } from '@filamind-app/core'

function defaultWsUrl(): string {
  const env = import.meta.env.VITE_MOONRAKER_WS_URL
  if (env) return env
  if (typeof window !== 'undefined' && window.location?.host) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    // dev: Vite proxies /websocket → Moonraker. prod: the printer host serves both.
    return `${proto}://${window.location.host}/websocket`
  }
  return 'ws://localhost:7125/websocket'
}

const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

/** The resolved Moonraker WS URL - shared so the command-bus agent connection targets the same host. */
export const moonrakerWsUrl = defaultWsUrl()

export const connector = new MoonrakerClient({ url: moonrakerWsUrl })

export const session = new FilaMindSession(connector, {
  subscriptions: FULL_CONTROL,
  identify: { client_name: 'FilaMind 3d', version: appVersion, type: 'web' },
  // NOTE: deliberately NO onAgentEvent here. Moonraker echoes notify_agent_event to every OTHER
  // connection (the sending agent socket is excluded per-connection, not per client_name), so this
  // data session receives the very commands 3d's own agent connection (./sender) broadcasts. Wiring
  // a handler would make 3d act on its own commands. If 3d ever needs to BE steered, add a
  // per-instance origin filter first (client_name alone is shared by sibling tabs).
})
