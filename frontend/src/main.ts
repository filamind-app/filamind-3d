import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  FULL_CONTROL,
  mergeSubscriptions,
  moonrakerDbPersistence,
  roamSettings,
} from '@filamind-app/core'

import App from './App.vue'
import './assets/styles/main.css'
import { router } from './router'
import { i18n, detectLocale, setLocale, initLocaleSync } from './core/i18n'
import { initTheme } from './core/theme'
import { settingsStore } from './core/settings'
import { session, connector } from './core/session'
import { getWidgets, aggregateSubscriptions } from './core/registry'
import { registerWidgets } from './widgets'

async function bootstrap(): Promise<void> {
  const title = import.meta.env.VITE_APP_TITLE
  if (title && typeof document !== 'undefined') document.title = title

  await settingsStore.hydrate() // load persisted settings (validated by core's migrate())
  initTheme() // apply theme + dir now, and on every later change
  registerWidgets()

  // Subscribe to the control baseline plus whatever the active widgets declare.
  const widgetIds = getWidgets('3d').map((w) => w.id)
  session.setSubscriptions(mergeSubscriptions(FULL_CONTROL, aggregateSubscriptions(widgetIds)))

  // Roam settings across surfaces via the printer's Moonraker DB (theme/locale set here reach the screen).
  roamSettings(settingsStore, moonrakerDbPersistence(connector), session.live)

  const locale = detectLocale(settingsStore.value.locale)
  await setLocale(locale)
  if (settingsStore.value.locale !== locale) settingsStore.patch({ locale })
  initLocaleSync() // switch vue-i18n's locale when a roamed/imported settings change moves it

  const app = createApp(App)
  app.use(createPinia())
  app.use(i18n)
  app.use(router)
  app.mount('#app')
}

void bootstrap()
