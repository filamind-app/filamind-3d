<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'

const { t, te } = useI18n()
const store = useSessionStore()

interface PrintStats {
  state?: string
  filename?: string
}
interface Sdcard {
  progress?: number
}

const stats = computed<PrintStats>(() => store.object<PrintStats>('print_stats') ?? {})
const progress = computed(() =>
  Math.round((store.object<Sdcard>('virtual_sdcard')?.progress ?? 0) * 100),
)
const stateLabel = computed(() => {
  const key = `widgets.printStatus.state.${stats.value.state ?? 'standby'}`
  return te(key) ? t(key) : (stats.value.state ?? '-')
})
</script>

<template>
  <div class="print">
    <div class="row">
      <span class="muted">{{ t('widgets.printStatus.status') }}</span>
      <span class="state">{{ stateLabel }}</span>
    </div>
    <div class="file" :title="stats.filename || ''">{{ stats.filename || '-' }}</div>
    <div
      class="bar"
      role="progressbar"
      :aria-valuenow="progress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="bar-fill" :style="{ width: progress + '%' }"></div>
    </div>
    <div class="pct">{{ progress }}%</div>
  </div>
</template>

<style scoped>
.print {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.muted {
  font-size: 0.85rem;
  color: var(--fm-text-muted);
}
.state {
  font-size: 0.85rem;
  color: var(--fm-text);
}
.file {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--fm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--fm-surface-2);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--fm-primary);
  transition: width 0.3s ease;
}
.pct {
  font-size: 0.75rem;
  color: var(--fm-text-muted);
  text-align: end;
}
</style>
