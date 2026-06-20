// Bind a framework-agnostic core Observable<T> to a Vue ref for the lifetime of a
// component. For app-lifetime singletons (the session store) subscribe directly instead.

import { shallowRef, onUnmounted, type ShallowRef } from 'vue'
import type { Observable } from '@filamind-app/core'

export function useObservable<T>(obs: Observable<T>): ShallowRef<T> {
  const state = shallowRef<T>(obs.value)
  const unsubscribe = obs.subscribe((v) => {
    state.value = v
  })
  onUnmounted(unsubscribe)
  return state
}
