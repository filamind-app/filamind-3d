// Pinia store wrapping the gated control actions with reactive busy / error / safe-mode
// state for the UI. Errors are surfaced as codes the components translate.

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { WriteRefused } from '@filamind-app/core'
import { control, arbiter } from '@/core/control'

export type ControlError = 'refused' | 'failed'

export const useControlStore = defineStore('control', () => {
  const busy = ref(false)
  const lastError = ref<ControlError | null>(null)
  const safeMode = ref(arbiter.safeMode.value)
  arbiter.safeMode.subscribe((v) => (safeMode.value = v)) // app-lifetime mirror

  async function run(fn: () => Promise<unknown>): Promise<void> {
    if (busy.value) return // interlock: never stack overlapping control actions
    busy.value = true
    lastError.value = null
    try {
      await fn()
    } catch (e) {
      lastError.value = e instanceof WriteRefused ? 'refused' : 'failed'
    } finally {
      busy.value = false
    }
  }

  return {
    busy,
    lastError,
    safeMode,
    home: () => run(control.home),
    pause: () => run(control.pause),
    resume: () => run(control.resume),
    cancel: () => run(control.cancel),
    runGcode: (script: string) => run(() => control.runGcode(script)),
    queueStart: () => run(control.queueStart),
    queuePause: () => run(control.queuePause),
    queueDelete: (id: string) => run(() => control.queueDelete(id)),
    excludeObject: (name: string) => run(() => control.excludeObject(name)),
    // E-STOP is never gated nor coupled to the busy interlock - it must always fire.
    emergencyStop: () => void control.emergencyStop().catch(() => undefined),
    toggleSafeMode: () => control.setSafeMode(!safeMode.value),
  }
})
