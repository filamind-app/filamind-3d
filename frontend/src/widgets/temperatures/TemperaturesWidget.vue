<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'

const { t } = useI18n()
const store = useSessionStore()

interface Heater {
  temperature?: number
  target?: number
}

const heaters = computed(() => {
  const rows: { id: string; label: string; cur: number; target: number }[] = []
  const ext = store.object<Heater>('extruder')
  if (ext) {
    rows.push({
      id: 'extruder',
      label: t('widgets.temperatures.hotend'),
      cur: ext.temperature ?? 0,
      target: ext.target ?? 0,
    })
  }
  const bed = store.object<Heater>('heater_bed')
  if (bed) {
    rows.push({
      id: 'bed',
      label: t('widgets.temperatures.bed'),
      cur: bed.temperature ?? 0,
      target: bed.target ?? 0,
    })
  }
  return rows
})

const fmt = (n: number): string => `${n.toFixed(1)}°C`
</script>

<template>
  <ul class="heaters">
    <li v-if="heaters.length === 0" class="empty">{{ t('widgets.temperatures.none') }}</li>
    <li v-for="h in heaters" :key="h.id" class="heater">
      <span class="heater-label">{{ h.label }}</span>
      <span class="heater-temp">
        {{ fmt(h.cur) }}<span class="heater-target"> / {{ fmt(h.target) }}</span>
      </span>
    </li>
  </ul>
</template>

<style scoped>
.heaters {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.heater {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.heater-label {
  font-size: 0.85rem;
  color: var(--fm-text-muted);
}
.heater-temp {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--fm-text);
}
.heater-target {
  color: var(--fm-text-muted);
}
.empty {
  font-size: 0.85rem;
  color: var(--fm-text-muted);
}
</style>
