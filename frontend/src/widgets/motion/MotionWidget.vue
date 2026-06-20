<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'

const { t } = useI18n()
const store = useSessionStore()

interface Toolhead {
  position?: number[]
  homed_axes?: string
}
interface MotionReport {
  live_position?: number[]
}

const AXES = ['X', 'Y', 'Z'] as const

const position = computed<number[]>(() => {
  const live = store.object<MotionReport>('motion_report')?.live_position
  const th = store.object<Toolhead>('toolhead')?.position
  return live ?? th ?? []
})
const homed = computed(() => store.object<Toolhead>('toolhead')?.homed_axes ?? '')

const isHomed = (axis: string): boolean => homed.value.toLowerCase().includes(axis.toLowerCase())
const coord = (i: number): string => (position.value[i] ?? 0).toFixed(2)
</script>

<template>
  <div class="motion">
    <div class="axes">
      <div v-for="(axis, i) in AXES" :key="axis" class="axis" :class="{ homed: isHomed(axis) }">
        <div class="axis-name">{{ axis }}</div>
        <div class="axis-value">{{ coord(i) }}</div>
      </div>
    </div>
    <p class="homed-line">
      {{
        homed
          ? t('widgets.motion.homed', { axes: homed.toUpperCase() })
          : t('widgets.motion.notHomed')
      }}
    </p>
  </div>
</template>

<style scoped>
.motion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.axes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.axis {
  text-align: center;
  padding: 0.5rem;
  border-radius: 10px;
  background: var(--fm-surface-2);
  border: 1px solid var(--fm-border);
}
.axis.homed {
  border-color: var(--fm-accent);
}
.axis-name {
  font-size: 0.7rem;
  color: var(--fm-text-muted);
}
.axis-value {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--fm-text);
}
.homed-line {
  margin: 0;
  font-size: 0.75rem;
  color: var(--fm-text-muted);
}
</style>
