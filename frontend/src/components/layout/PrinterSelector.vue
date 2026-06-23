<script setup lang="ts">
// Top-bar printer selector. Shows the connected printer's name + a live/offline dot. A single
// host today (one Moonraker), so the menu just reflects the current printer; the affordance matches
// the suite mockup and is the seam for multi-printer later.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { connector } from '@/core/session'
import { useSessionStore } from '@/core/store/session'

const { t } = useI18n()
const session = useSessionStore()

const hostname = ref('')
onMounted(async () => {
  try {
    const info = await connector.call<{ hostname?: string }>('printer.info')
    hostname.value = info?.hostname ?? ''
  } catch {
    hostname.value = ''
  }
})

const name = computed(() => hostname.value || t('printer.unknown'))
const online = computed(() => session.live)
</script>

<template>
  <div class="printer-selector" :title="name">
    <span class="dot" :class="{ online }" aria-hidden="true"></span>
    <span class="ico" aria-hidden="true">🖨</span>
    <span class="name">{{ name }}</span>
    <span class="chev" aria-hidden="true">▾</span>
  </div>
</template>

<style scoped>
.printer-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--fm-border);
  border-radius: 8px;
  background: var(--fm-surface-2, transparent);
  font-size: 0.85rem;
  color: var(--fm-text);
  max-width: 16rem;
}
.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--fm-text-muted);
  flex-shrink: 0;
}
.dot.online {
  background: var(--fm-success, #3fb950);
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chev {
  color: var(--fm-text-muted);
  font-size: 0.7rem;
}
</style>
