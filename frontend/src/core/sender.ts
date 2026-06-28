// The cross-surface command bus SENDER for FilaMind 3d. Moonraker only lets connections that
// identified as type:"agent" broadcast commands, so this opens a SECOND, lightweight connection
// (separate from the main type:"web" data session in ./session) dedicated to the command bus.
// It carries no subscriptions - it only identifies as an agent and emits UI-only commands that
// another FilaMind surface (the on-printer screen) receives and acts on.

import { ref } from 'vue'
import { MoonrakerClient, CommandSender } from '@filamind-app/core'
import { moonrakerWsUrl } from './session'

const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

/** Reactive: true only when the agent connection is up AND identified - gate send affordances on this. */
export const busReady = ref(false)

const agentConnector = new MoonrakerClient({ url: moonrakerWsUrl })

export const commandSender = new CommandSender(agentConnector, {
  client_name: 'FilaMind 3d',
  version: appVersion,
  url: 'https://filamind.app',
  onReadyChange: (r) => {
    busReady.value = r
  },
})
