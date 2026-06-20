<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'
import { useLiveFetch } from '@/core/useLiveFetch'
import { jobs, type HistoryJob } from '@/core/jobs'

const { t, te } = useI18n()
const session = useSessionStore()
// Refetch when the connection goes live AND when a print ends (so finished jobs appear).
const { data, loading, error, load } = useLiveFetch(
  () => jobs.history(8),
  () => session.object('print_stats')?.state,
)

const items = computed<HistoryJob[]>(() => data.value?.jobs ?? [])

function fmtDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
function statusLabel(status: string): string {
  const key = `widgets.history.status.${status}`
  return te(key) ? t(key) : status
}
</script>

<template>
  <div class="history">
    <div class="head">
      <button class="fm-btn small" type="button" :disabled="!session.live || loading" @click="load">
        {{ t('widgets.history.refresh') }}
      </button>
    </div>

    <ul v-if="items.length" class="list">
      <li v-for="j in items" :key="j.job_id" class="row">
        <span class="file" :title="j.filename">{{ j.filename }}</span>
        <span class="meta">{{ statusLabel(j.status) }} · {{ fmtDuration(j.total_duration) }}</span>
      </li>
    </ul>
    <div v-else class="state" role="status" aria-live="polite">
      <p v-if="!session.live" class="muted">{{ t('shell.trust.offline') }}</p>
      <p v-else-if="loading" class="muted">{{ t('common.loading') }}</p>
      <button v-else-if="error" class="fm-btn small" type="button" @click="load">
        {{ t('common.retry') }}
      </button>
      <p v-else class="muted">{{ t('widgets.history.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.head {
  display: flex;
  justify-content: flex-end;
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
  align-items: baseline;
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
.meta {
  flex: none;
  font-size: 0.75rem;
  color: var(--fm-text-muted);
}
</style>
