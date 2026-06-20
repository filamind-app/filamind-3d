// The app's single SettingsStore (theme · locale · density · motif · reduced-motion),
// persisted to localStorage under the same key the no-flash boot script reads.

import { SettingsStore, localStoragePersistence } from '@filamind-app/core'

export const SETTINGS_KEY = 'filamind.settings'

export const settingsStore = new SettingsStore(localStoragePersistence(SETTINGS_KEY))
