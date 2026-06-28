// Fetch-on-live helper for widgets that read Moonraker server.* RPC (history, queue): load
// when the connection is live, re-load when it becomes live (and on an optional extra trigger,
// e.g. print-state changes), expose loading/error state. A sequence token drops stale responses.

import { ref, watch, type Ref, type WatchSource } from 'vue'
import { useSessionStore } from '@/core/store/session'

export function useLiveFetch<T>(loader: () => Promise<T>, alsoOn?: WatchSource) {
  const session = useSessionStore()
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref(false)
  let seq = 0

  async function load(): Promise<void> {
    if (!session.live) return
    const mine = ++seq
    loading.value = true
    error.value = false
    try {
      const result = await loader()
      if (mine !== seq) return // a newer load() started - drop this stale response
      data.value = result
    } catch {
      if (mine === seq) error.value = true
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  watch(
    () => session.live,
    (live) => void (live && load()),
    { immediate: true },
  )
  if (alsoOn) watch(alsoOn, () => void (session.live && load()))

  return { data, loading, error, load }
}
