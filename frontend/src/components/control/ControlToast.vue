<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useControlStore } from '@/core/store/control'

const { t } = useI18n()
const ctl = useControlStore()

// Surface control refusals/failures globally, so actions fired from the command palette on
// any route (not just the dashboard ControlBar) still report when they were refused.
const message = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => ctl.lastError,
  (err) => {
    if (!err) return
    message.value = t('control.error.' + err)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (message.value = null), 4000)
  },
)
</script>

<template>
  <transition name="toast">
    <div v-if="message" class="toast" role="alert">{{ message }}</div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 1.25rem;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  background: var(--fm-surface-2);
  color: var(--fm-text);
  border: 1px solid var(--fm-danger);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  z-index: 70;
  font-size: 0.85rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
