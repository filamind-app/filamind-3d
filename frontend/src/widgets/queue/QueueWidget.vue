<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'
import { useControlStore } from '@/core/store/control'
import { useWriteGuard } from '@/core/useWriteGuard'
import { useLiveFetch } from '@/core/useLiveFetch'
import { jobs, type QueueJob } from '@/core/jobs'

const { t, te } = useI18n()
const session = useSessionStore()
const ctl = useControlStore()
const { canWrite, blockedReason } = useWriteGuard()
const { data, loading, error, load } = useLiveFetch(
  () => jobs.queueStatus(),
  () => session.object('print_stats')?.state,
)

const queued = computed<QueueJob[]>(() => data.value?.queued_jobs ?? [])
const queueStateLabel = computed(() => {
  const raw = data.value?.queue_state ?? '—'
  const key = `widgets.queue.queueState.${raw}`
  return te(key) ? t(key) : raw
})

// Run a gated mutation; refresh only if it actually went through (run() never rejects).
async function act(action: () => Promise<void>): Promise<void> {
  await action()
  if (!ctl.lastError) await load()
}
</script>

<template>
  <div class="queue">
    <div class="head">
      <span class="state" role="status" aria-live="polite">
        {{ t('widgets.queue.state', { state: queueStateLabel }) }}
      </span>
      <button class="fm-btn small" type="button" :disabled="!session.live || loading" @click="load">
        {{ t('widgets.queue.refresh') }}
      </button>
    </div>

    <div class="actions">
      <button
        class="fm-btn small"
        type="button"
        :disabled="!canWrite"
        :title="canWrite ? '' : blockedReason"
        @click="act(() => ctl.queueStart())"
      >
        {{ t('widgets.queue.start') }}
      </button>
      <button
        class="fm-btn small"
        type="button"
        :disabled="!canWrite"
        :title="canWrite ? '' : blockedReason"
        @click="act(() => ctl.queuePause())"
      >
        {{ t('widgets.queue.pause') }}
      </button>
    </div>

    <ul v-if="queued.length" class="list">
      <li v-for="j in queued" :key="j.job_id" class="row">
        <span class="file" :title="j.filename">{{ j.filename }}</span>
        <button
          class="fm-btn small"
          type="button"
          :disabled="!canWrite"
          :title="canWrite ? '' : blockedReason"
          :aria-label="`${t('widgets.queue.remove')} ${j.filename}`"
          @click="act(() => ctl.queueDelete(j.job_id))"
        >
          {{ t('widgets.queue.remove') }}
        </button>
      </li>
    </ul>
    <div v-else class="state-line" role="status" aria-live="polite">
      <p v-if="!session.live" class="muted">{{ t('shell.trust.offline') }}</p>
      <button v-else-if="error" class="fm-btn small" type="button" @click="load">
        {{ t('common.retry') }}
      </button>
      <p v-else class="muted">{{ t('widgets.queue.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.queue {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.state {
  font-size: 0.8rem;
  color: var(--fm-text-muted);
}
.actions {
  display: flex;
  gap: 0.4rem;
}
.small {
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
}
.muted {
  margin: 0;
  font-size: 0.85rem;
  color: var(--fm-text-muted);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.file {
  font-size: 0.82rem;
  color: var(--fm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
