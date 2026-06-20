<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { shippedLocales, setLocale } from '@/core/i18n'
import { useSettingsStore } from '@/core/store/settings'

const { t, locale } = useI18n()
const settings = useSettingsStore()

async function choose(code: string): Promise<void> {
  await setLocale(code)
  settings.patch({ locale: code })
}
</script>

<template>
  <label class="lang">
    <span class="lang-label">{{ t('settings.language.label') }}</span>
    <select
      class="fm-btn lang-select"
      :value="locale"
      @change="choose(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="l in shippedLocales" :key="l.code" :value="l.code">{{ l.name }}</option>
    </select>
  </label>
</template>

<style scoped>
.lang {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.lang-label {
  font-size: 0.85rem;
  color: var(--fm-text-muted);
}
.lang-select {
  min-width: 12rem;
}
</style>
