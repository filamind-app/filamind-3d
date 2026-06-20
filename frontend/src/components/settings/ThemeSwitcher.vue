<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { themes, type ThemeName } from '@filamind-app/core'
import { useSettingsStore } from '@/core/store/settings'

const { t } = useI18n()
const settings = useSettingsStore()
const names = Object.keys(themes) as ThemeName[]
</script>

<template>
  <div class="theme-grid">
    <button
      v-for="n in names"
      :key="n"
      type="button"
      class="swatch"
      :class="{ selected: settings.state.theme === n }"
      :aria-pressed="settings.state.theme === n"
      @click="settings.patch({ theme: n })"
    >
      <span class="dots">
        <span :style="{ background: themes[n].primary }"></span>
        <span :style="{ background: themes[n].secondary }"></span>
        <span :style="{ background: themes[n].accent }"></span>
      </span>
      <span class="name">{{ t('settings.theme.' + n) }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}
.swatch {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--fm-surface-2);
  border: 2px solid var(--fm-border);
  cursor: pointer;
  text-align: start;
}
.swatch.selected {
  border-color: var(--fm-primary);
}
.dots {
  display: flex;
  gap: 0.35rem;
}
.dots span {
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
}
.name {
  font-size: 0.85rem;
  color: var(--fm-text);
}
</style>
