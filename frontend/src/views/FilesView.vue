<script setup lang="ts">
// G-code files: browse the printer's gcodes, upload new ones, and start a print. Reads/writes go
// through the shared Moonraker connector; starting a print is gated by the write guard.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { connector } from '@/core/session'
import { useWriteGuard } from '@/core/useWriteGuard'

const { t } = useI18n()
const { canWrite, blockedReason } = useWriteGuard()

interface GcodeFile {
  path: string
  modified?: number
  size?: number
}
const files = ref<GcodeFile[]>([])
const loading = ref(true)
const error = ref('')
const busy = ref('')
const uploadPct = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

async function refresh(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const list = await connector.call<GcodeFile[]>('server.files.list', { root: 'gcodes' })
    files.value = [...list].sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0))
  } catch {
    error.value = t('files.loadError')
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

const fmtSize = (n?: number): string => {
  if (!n) return ''
  const mb = n / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}
const fmtDate = (s?: number): string =>
  s ? new Date(s * 1000).toISOString().slice(0, 16).replace('T', ' ') : ''
const baseName = (p: string): string => p.split('/').pop() ?? p

async function startPrint(path: string): Promise<void> {
  if (!canWrite.value || busy.value) return
  busy.value = path
  try {
    await connector.call('printer.print.start', { filename: path })
  } catch {
    error.value = t('files.printError')
  } finally {
    busy.value = ''
  }
}

async function onUpload(e: Event): Promise<void> {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploadPct.value = 0
  error.value = ''
  try {
    await connector.upload('gcodes', f, (pct) => (uploadPct.value = Math.round(pct)))
    await refresh()
  } catch {
    error.value = t('files.uploadError')
  } finally {
    uploadPct.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
}

const hasFiles = computed(() => files.value.length > 0)
</script>

<template>
  <div class="files">
    <div class="head">
      <h1 class="page-title">{{ t('files.title') }}</h1>
      <div class="actions">
        <button
          class="fm-btn"
          type="button"
          :disabled="uploadPct !== null"
          @click="fileInput?.click()"
        >
          ⬆ {{ uploadPct === null ? t('files.upload') : `${uploadPct}%` }}
        </button>
        <button class="fm-btn" type="button" :disabled="loading" @click="refresh">↻</button>
        <input
          ref="fileInput"
          type="file"
          accept=".gcode,.g,.gco,.ufp"
          class="hidden-input"
          @change="onUpload"
        />
      </div>
    </div>

    <p v-if="error" role="alert" class="fm-card error">{{ error }}</p>
    <p v-if="loading" class="muted">{{ t('files.loading') }}</p>
    <p v-else-if="!hasFiles" class="muted">{{ t('files.empty') }}</p>

    <ul v-else class="list">
      <li v-for="f in files" :key="f.path" class="row fm-card">
        <div class="info">
          <div class="name" :title="f.path">{{ baseName(f.path) }}</div>
          <div class="meta">
            {{ fmtSize(f.size) }} <span v-if="f.modified">· {{ fmtDate(f.modified) }}</span>
          </div>
        </div>
        <button
          class="fm-btn print"
          type="button"
          :disabled="!canWrite || busy === f.path"
          :title="canWrite ? '' : blockedReason"
          @click="startPrint(f.path)"
        >
          ▶ {{ busy === f.path ? t('files.starting') : t('files.print') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.files {
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
.actions {
  display: flex;
  gap: 0.5rem;
}
.hidden-input {
  display: none;
}
.error {
  background: var(--fm-danger, crimson);
  color: #fff;
  padding: 0.5rem 0.8rem;
}
.muted {
  color: var(--fm-text-muted);
  padding: 1rem 0;
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
.name {
  color: var(--fm-text);
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  color: var(--fm-text-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
.print {
  flex-shrink: 0;
}
</style>
