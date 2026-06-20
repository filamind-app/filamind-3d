<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'
import { useControlStore } from '@/core/store/control'
import { useWriteGuard } from '@/core/useWriteGuard'

const { t } = useI18n()
const session = useSessionStore()
const ctl = useControlStore()
// canWrite + the disabled-reason tooltip (shared across every control surface).
const { canWrite, blockedReason } = useWriteGuard()

interface PrintStats {
  state?: string
}
const printState = computed(() => session.object<PrintStats>('print_stats')?.state ?? 'standby')
const isPrinting = computed(() => printState.value === 'printing')
const isPaused = computed(() => printState.value === 'paused')

// Cancelling a print is destructive + irreversible → require a confirm click.
const confirmingCancel = ref(false)
let cancelTimer: ReturnType<typeof setTimeout> | undefined
function onCancel(): void {
  if (confirmingCancel.value) {
    confirmingCancel.value = false
    if (cancelTimer) clearTimeout(cancelTimer)
    void ctl.cancel()
  } else {
    confirmingCancel.value = true
    cancelTimer = setTimeout(() => (confirmingCancel.value = false), 3000)
  }
}
</script>

<template>
  <div class="control-bar fm-card" role="group" :aria-label="t('control.title')">
    <button
      class="fm-btn"
      type="button"
      :disabled="!canWrite"
      :title="canWrite ? '' : blockedReason"
      @click="ctl.home()"
    >
      🏠 {{ t('control.home') }}
    </button>
    <button
      v-if="isPrinting"
      class="fm-btn"
      type="button"
      :disabled="!canWrite"
      @click="ctl.pause()"
    >
      ⏸ {{ t('control.pause') }}
    </button>
    <button
      v-if="isPaused"
      class="fm-btn"
      type="button"
      :disabled="!canWrite"
      @click="ctl.resume()"
    >
      ▶ {{ t('control.resume') }}
    </button>
    <button
      v-if="isPrinting || isPaused"
      class="fm-btn"
      :class="{ warning: confirmingCancel }"
      type="button"
      :disabled="!canWrite"
      @click="onCancel"
    >
      ⏹ {{ confirmingCancel ? t('control.cancelConfirm') : t('control.cancel') }}
    </button>

    <span class="spacer"></span>

    <button
      class="fm-btn safe"
      :class="{ on: ctl.safeMode }"
      type="button"
      :aria-pressed="ctl.safeMode"
      @click="ctl.toggleSafeMode()"
    >
      🛡 {{ ctl.safeMode ? t('control.safeOn') : t('control.safeOff') }}
    </button>
    <button class="fm-btn estop" type="button" @click="ctl.emergencyStop()">
      ⛔ {{ t('control.estop') }}
    </button>
  </div>
</template>

<style scoped>
.control-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.75rem;
}
.spacer {
  flex: 1;
}
.fm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.warning {
  border-color: var(--fm-warning);
  color: var(--fm-warning);
}
.safe.on {
  border-color: var(--fm-warning);
  color: var(--fm-warning);
}
.estop {
  background: var(--fm-danger);
  color: #fff;
  border-color: transparent;
  font-weight: 600;
}
</style>
