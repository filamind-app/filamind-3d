<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore, type TrustState } from '@/core/store/session'

const { t } = useI18n()
const store = useSessionStore()

const STATE: Record<TrustState, { dot: string; key: string }> = {
  live: { dot: 'var(--fm-success)', key: 'shell.trust.live' },
  stale: { dot: 'var(--fm-warning)', key: 'shell.trust.stale' },
  shutdown: { dot: 'var(--fm-danger)', key: 'shell.trust.shutdown' },
  error: { dot: 'var(--fm-danger)', key: 'shell.trust.error' },
  offline: { dot: 'var(--fm-text-muted)', key: 'shell.trust.offline' },
}
const current = computed(() => STATE[store.trust])
</script>

<template>
  <div class="trust" :title="t('shell.trust.help')" role="status">
    <span class="dot" :style="{ background: current.dot }" aria-hidden="true"></span>
    <span class="label">{{ t(current.key) }}</span>
  </div>
</template>

<style scoped>
.trust {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 0%, transparent);
}
.label {
  color: var(--fm-text-muted);
}
</style>
