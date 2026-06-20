<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/core/store/settings'
import ThemeSwitcher from '@/components/settings/ThemeSwitcher.vue'
import LanguageSwitcher from '@/components/settings/LanguageSwitcher.vue'

const { t } = useI18n()
const settings = useSettingsStore()
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

const densities = ['comfortable', 'compact'] as const
const motifs = ['off', 'subtle', 'full'] as const

function onImport(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => settings.importJson(String(reader.result))
  reader.readAsText(file)
}

function doExport(): void {
  const blob = new Blob([settings.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'filamind-settings.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="settings-page">
    <h1 class="page-title">{{ t('settings.title') }}</h1>

    <section class="fm-card block">
      <h2 class="block-title">{{ t('settings.theme.title') }}</h2>
      <ThemeSwitcher />
    </section>

    <section class="fm-card block">
      <h2 class="block-title">{{ t('settings.language.title') }}</h2>
      <LanguageSwitcher />
    </section>

    <section class="fm-card block">
      <h2 class="block-title">{{ t('settings.display.title') }}</h2>

      <label class="row">
        <span class="row-label">{{ t('settings.display.density') }}</span>
        <select
          class="fm-btn"
          :value="settings.state.density"
          @change="
            settings.patch({
              density: ($event.target as HTMLSelectElement).value as (typeof densities)[number],
            })
          "
        >
          <option v-for="d in densities" :key="d" :value="d">
            {{ t('settings.display.densityOpt.' + d) }}
          </option>
        </select>
      </label>

      <label class="row">
        <span class="row-label">{{ t('settings.display.motif') }}</span>
        <select
          class="fm-btn"
          :value="settings.state.motifDensity"
          @change="
            settings.patch({
              motifDensity: ($event.target as HTMLSelectElement).value as (typeof motifs)[number],
            })
          "
        >
          <option v-for="m in motifs" :key="m" :value="m">
            {{ t('settings.display.motifOpt.' + m) }}
          </option>
        </select>
      </label>

      <label class="row">
        <span class="row-label">{{ t('settings.display.reducedMotion') }}</span>
        <input
          type="checkbox"
          :checked="settings.state.reducedMotion"
          @change="settings.patch({ reducedMotion: ($event.target as HTMLInputElement).checked })"
        />
      </label>
    </section>

    <section class="fm-card block">
      <h2 class="block-title">{{ t('settings.data.title') }}</h2>
      <div class="actions">
        <button class="fm-btn fm-btn-primary" type="button" @click="doExport">
          {{ t('settings.data.export') }}
        </button>
        <label class="fm-btn import-label">
          {{ t('settings.data.import') }}
          <input type="file" accept="application/json" class="visually-hidden" @change="onImport" />
        </label>
        <button class="fm-btn" type="button" @click="settings.reset()">
          {{ t('settings.data.reset') }}
        </button>
      </div>
      <p class="note">{{ t('settings.data.note') }}</p>
    </section>

    <p class="version">{{ t('settings.version', { v: appVersion }) }}</p>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 42rem;
}
.page-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--fm-text);
}
.block {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.block-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--fm-text);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.row-label {
  font-size: 0.9rem;
  color: var(--fm-text-muted);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.import-label {
  cursor: pointer;
}
.note {
  margin: 0;
  font-size: 0.78rem;
  color: var(--fm-text-muted);
}
.version {
  font-size: 0.78rem;
  color: var(--fm-text-muted);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
