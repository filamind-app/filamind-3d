// Pinia store wrapping the core FilaMindSession: mirrors its framework-agnostic
// Observables into Vue refs (app-lifetime subscriptions - no teardown), and exposes
// the derived connection/trust state the UI dims on.

import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import type { PrinterObjects, KlippyState, PromptEvent } from '@filamind-app/core'
import { session } from '@/core/session'

export type TrustState = 'live' | 'stale' | 'shutdown' | 'error' | 'offline'

export const useSessionStore = defineStore('session', () => {
  const objects = shallowRef<PrinterObjects>(session.printer.objects.value)
  const klippy = ref<KlippyState>(session.klippy.value)
  const live = ref<boolean>(session.live.value)
  const capabilities = shallowRef<string[]>(session.capabilities.value)
  const prompt = shallowRef<PromptEvent>(session.prompt.value)

  // The store lives for the whole app, so these subscriptions never need teardown.
  session.printer.objects.subscribe((v) => (objects.value = v))
  session.klippy.subscribe((v) => (klippy.value = v))
  session.live.subscribe((v) => (live.value = v))
  session.capabilities.subscribe((v) => (capabilities.value = v))
  session.prompt.subscribe((v) => (prompt.value = v))

  const klippyReady = computed(() => klippy.value === 'ready')

  const trust = computed<TrustState>(() => {
    if (klippy.value === 'shutdown') return 'shutdown'
    if (klippy.value === 'error') return 'error'
    if (live.value) return 'live'
    if (klippy.value === 'disconnected') return 'offline'
    return 'stale'
  })

  /** A printer object by name (e.g. 'extruder', 'toolhead', 'print_stats'). */
  function object<T = Record<string, unknown>>(name: string): T | undefined {
    return objects.value[name] as T | undefined
  }

  let started = false
  async function start(): Promise<void> {
    if (started) return
    started = true
    await session.start()
  }
  function stop(): void {
    session.stop()
  }

  // `capabilities` (Moonraker components) is exposed for upcoming capability-aware empty states.
  return { objects, klippy, live, capabilities, prompt, klippyReady, trust, object, start, stop }
})
