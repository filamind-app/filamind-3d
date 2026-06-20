// Pinia store mirroring the core SettingsStore into a Vue ref so components re-render on
// change. Writes go straight through to core (which persists + re-themes via initTheme()).

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings } from '@filamind-app/core'
import { settingsStore } from '@/core/settings'

export const useSettingsStore = defineStore('settings', () => {
  const state = ref<UserSettings>(settingsStore.value)
  settingsStore.settings.subscribe((s) => (state.value = s)) // app-lifetime mirror

  function patch(p: Partial<UserSettings>): void {
    settingsStore.patch(p)
  }
  function reset(): void {
    settingsStore.reset()
  }
  function exportJson(): string {
    return settingsStore.export()
  }
  function importJson(json: string): void {
    settingsStore.import(json)
  }

  return { state, patch, reset, exportJson, importJson }
})
