<script setup lang="ts">
// Installed components + their update status, read from Moonraker's update manager. Each entry is a
// managed repo / web UI / system-package set with a current and a latest version; we show whether it
// is up to date, how far behind, or locally modified. Read-only - applying updates is a heavy host
// operation that belongs to the host's own update flow, not this control UI. Component names are
// runtime data from the printer, not shipped strings.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { connector } from '@/core/session'

const { t } = useI18n()

interface Comp {
  name: string
  type: string // git_repo | web | system
  version: string
  remote: string
  behind: number
  dirty: boolean
  status: 'upToDate' | 'updateAvailable' | 'behind' | 'modified' | 'unknown'
}

const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const comps = ref<Comp[]>([])

interface RawInfo {
  configured_type?: string
  version?: string
  remote_version?: string
  commits_behind?: unknown[]
  is_dirty?: boolean
}

function classify(i: RawInfo): Comp['status'] {
  if (i.is_dirty) return 'modified'
  const behind = Array.isArray(i.commits_behind) ? i.commits_behind.length : 0
  if (behind > 0) return 'behind'
  if (i.version && i.remote_version && i.version !== i.remote_version) return 'updateAvailable'
  if (i.version && i.remote_version && i.version === i.remote_version) return 'upToDate'
  return 'unknown'
}

// Out-of-date and modified first, plain/unknown last; alphabetical within a rank.
const RANK: Record<Comp['status'], number> = {
  modified: 0,
  behind: 1,
  updateAvailable: 2,
  upToDate: 3,
  unknown: 4,
}

async function load(refresh = false): Promise<void> {
  if (refresh) refreshing.value = true
  else loading.value = true
  error.value = ''
  try {
    const res = await connector.call<{ version_info?: Record<string, RawInfo> }>(
      'machine.update.status',
      { refresh },
    )
    const vi = res.version_info ?? {}
    comps.value = Object.entries(vi)
      .map(([name, i]) => ({
        name,
        type: i.configured_type ?? 'unknown',
        version: i.version ?? '',
        remote: i.remote_version ?? '',
        behind: Array.isArray(i.commits_behind) ? i.commits_behind.length : 0,
        dirty: Boolean(i.is_dirty),
        status: classify(i),
      }))
      .sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name))
  } catch {
    error.value = t('plugins.error')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}
onMounted(() => load(false))

const typeKey = (tp: string): string =>
  tp === 'web' ? 'web' : tp === 'system' ? 'system' : tp === 'git_repo' ? 'git' : 'git'
const hasComps = computed(() => comps.value.length > 0)
</script>

<template>
  <div class="plugins">
    <div class="head">
      <h1 class="page-title">{{ t('plugins.title') }}</h1>
      <button class="fm-btn" type="button" :disabled="loading || refreshing" @click="load(true)">
        ↻ {{ refreshing ? t('plugins.refreshing') : t('plugins.refresh') }}
      </button>
    </div>

    <p v-if="error" role="alert" class="fm-card error">{{ error }}</p>
    <p v-if="loading" class="muted">{{ t('plugins.loading') }}</p>
    <p v-else-if="!hasComps" class="muted">{{ t('plugins.empty') }}</p>

    <ul v-else class="list">
      <li v-for="c in comps" :key="c.name" class="row fm-card">
        <div class="info">
          <div class="name-row">
            <span class="name">{{ c.name }}</span>
            <span class="type">{{ t('plugins.type.' + typeKey(c.type)) }}</span>
          </div>
          <div v-if="c.version" class="ver mono">
            {{ c.version }}
            <span v-if="c.remote && c.remote !== c.version" class="arrow">→ {{ c.remote }}</span>
          </div>
        </div>
        <span class="badge" :class="c.status">
          <template v-if="c.status === 'behind'">{{
            t('plugins.status.behind', { n: c.behind })
          }}</template>
          <template v-else>{{ t('plugins.status.' + c.status) }}</template>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.plugins {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.page-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--fm-text);
}
.muted {
  color: var(--fm-text-muted);
  padding: 0.5rem 0;
}
.error {
  background: var(--fm-danger, crimson);
  color: #fff;
  padding: 0.5rem 0.8rem;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0.9rem;
}
.info {
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.name {
  color: var(--fm-text);
  font-size: 0.95rem;
  font-weight: 500;
}
.type {
  font-size: 0.68rem;
  color: var(--fm-text-muted);
  border: 1px solid var(--fm-border);
  border-radius: 5px;
  padding: 0.02rem 0.4rem;
}
.ver {
  font-size: 0.76rem;
  color: var(--fm-text-muted);
  margin-top: 0.15rem;
}
.arrow {
  color: var(--fm-primary);
}
.badge {
  flex-shrink: 0;
  font-size: 0.72rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}
.badge.upToDate {
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.18));
  color: var(--fm-success, #3fb950);
}
.badge.behind,
.badge.updateAvailable {
  background: var(--fm-primary);
  color: var(--fm-primary-contrast);
}
.badge.modified {
  background: var(--fm-warn, #c9892b);
  color: #1a1205;
}
.badge.unknown {
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.18));
  color: var(--fm-text-muted);
}
</style>
